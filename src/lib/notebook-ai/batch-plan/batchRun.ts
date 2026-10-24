import { usePages } from "@/stores/usePages";
import { isRunWriteScopeRevoked } from "../resourceScope";
import type { BatchPlanJournal, BatchPlanExecuteResult, BatchOperationResult } from "./types";
import { writeBatchPlanJournal } from "./journal";
import { formatBatchPlanErrors } from "@/lib/notebook-ai/errors";
import { recoverInterruptedOperation } from "./batchRecovery";
import { preflight } from "./batchPreflight";
import { pendingOperations, successfulOperationIds, resultForOperation, clone, revisionOf } from "./batchShared";
import { executeOperation } from "./batchExecuteOperation";
import { compensate } from "./batchCompensate";
import { operationNotebookId } from "./batchTargets";

export async function run(journal: BatchPlanJournal): Promise<BatchPlanExecuteResult> {
  if (journal.status === "completed") return { ok: true, journal, results: journal.results };
  if (["invalid", "undone", "undo-conflicted"].includes(journal.status)) return {
    ok: false, journal, error: journal.error || "计划状态不允许执行", results: journal.results,
  };
  if (!journal.selectedOperationIds.length) return {
    ok: false, journal, error: "至少选择一项操作后才能执行", results: journal.results,
  };
  const wasInterrupted = Boolean(journal.executingOperationId);
  const recovered = await recoverInterruptedOperation(journal);
  if (wasInterrupted && recovered.status === "failed") {
    const operationId = journal.executingOperationId!;
    const error = recovered.error || "中断恢复失败";
    const operation = recovered.input.operations.find((item) => item.operationId === operationId);
    const failed = writeBatchPlanJournal({ ...recovered, recoveryConflicts: {
      ...recovered.recoveryConflicts, [operationId]: error }, results: operation ? [
        ...recovered.results.filter((item) => item.operationId !== operationId),
        { operationId, type: operation.type, ok: false, pageIds: [], error,
          notebookId: operationNotebookId(recovered, operation), target: recovered.operationTargets?.[operationId] },
      ] : recovered.results });
    return { ok: false, journal: failed, error, results: failed.results };
  }
  if (journal.version === 1) {
    const conflict = await preflight(recovered);
    if (conflict) {
      const failed = writeBatchPlanJournal({ ...recovered, status: "failed", error: conflict });
      return { ok: false, journal: failed, error: conflict, results: failed.results };
    }
  }
  let working = writeBatchPlanJournal({ ...recovered, status: "executing", error: undefined });
  for (const operation of pendingOperations(working)) {
    const notebookId = operationNotebookId(working, operation);
    const target = working.operationTargets?.[operation.operationId];
    const completed = successfulOperationIds(working);
    const dependencyFailed = (operation.dependsOn ?? []).some((id) => !completed.has(id));
    const conflict = working.recoveryConflicts?.[operation.operationId] ??
      (journal.version === 2 ? await preflight({ ...working,
        selectedOperationIds: [operation.operationId] }) : null);
    let result: BatchOperationResult;
    const executionState = { working };
    try {
      if (dependencyFailed) throw new Error("前置操作未成功，本项未执行");
      if (conflict) throw new Error(conflict);
      if (working.writeScope && isRunWriteScopeRevoked(working.writeScope)) throw new Error("本轮写入范围已撤销");
      // Persist intent before each mutation; scope and location were checked at this boundary.
      const livePage = operation.type === "edit" || operation.type === "search_replace"
        ? usePages.getState().pages[operation.pageId] : undefined;
      working = writeBatchPlanJournal({ ...working, executingOperationId: operation.operationId,
        executingStartedAt: Date.now(), operationBefore: livePage ? {
          ...working.operationBefore, [operation.operationId]: { pageId: livePage.id,
            page: clone(livePage), revision: revisionOf(livePage) } } : working.operationBefore });
      executionState.working = working;
      const execution = await executeOperation(operation, executionState);
      working = execution.working;
      result = { ...execution.result, notebookId, target };
      if (execution.recorded) {
        working = writeBatchPlanJournal({ ...working, results: working.results.map((item) =>
          item.operationId === operation.operationId ? result : item) });
        continue;
      }
    } catch (error) {
      working = executionState.working;
      // A throwing adapter may already have committed. Reconcile its persisted intent
      // before classifying failure; recovery compensates only provable partial writes.
      if (working.executingOperationId) {
        const reconciled = await recoverInterruptedOperation(working);
        working = reconciled;
        const committed = resultForOperation(working, operation.operationId);
        if (committed) {
          working = writeBatchPlanJournal({ ...working, status: "executing", error: undefined,
            results: working.results.map((item) => item.operationId === operation.operationId
              ? { ...item, notebookId, target } : item) });
          continue;
        }
      }
      const recoveryError = working.status === "failed" ? working.error : undefined;
      if (recoveryError) working = { ...working, recoveryConflicts: {
        ...working.recoveryConflicts, [operation.operationId]: recoveryError } };
      result = { operationId: operation.operationId, type: operation.type, ok: false,
        notebookId, target, skipped: Boolean(dependencyFailed || conflict),
        pageIds: operation.type === "delete" ? operation.pageIds
          : operation.type === "create" ? [] : [operation.pageId],
        error: formatBatchPlanErrors([error instanceof Error ? error.message : "执行失败", recoveryError ?? ""]) };
      working = writeBatchPlanJournal({ ...working,
        results: [...working.results.filter((item) => item.operationId !== operation.operationId), result],
        status: "executing", executingOperationId: undefined, executingStartedAt: undefined });
      if (journal.version === 2) continue;
      const compensationErrors = await compensate(working);
      working = writeBatchPlanJournal({ ...working, status: "failed",
        rollbackStatus: compensationErrors.length ? "incomplete" : "complete",
        error: formatBatchPlanErrors([result.error ?? "", ...compensationErrors]) });
      return { ok: false, journal: working, error: working.error!, results: working.results };
    }
    working = writeBatchPlanJournal({ ...working,
      results: [...working.results.filter((item) => item.operationId !== operation.operationId), result],
      executingOperationId: undefined, executingStartedAt: undefined });
  }
  const selected = new Set(working.selectedOperationIds);
  const errors = working.results.filter((item) => selected.has(item.operationId) && !item.ok)
    .map((item) => item.error || "执行失败");
  working = writeBatchPlanJournal({ ...working, status: errors.length ? "failed" : "completed",
    error: errors.length ? formatBatchPlanErrors(errors) : undefined });
  return errors.length ? { ok: false, journal: working, error: working.error!, results: working.results }
    : { ok: true, journal: working, results: working.results };
}
