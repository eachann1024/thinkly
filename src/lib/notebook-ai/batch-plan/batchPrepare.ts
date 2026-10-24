import type {
  BatchPlanInput,
  BatchPlanPrepareResult,
  FrozenPageSnapshot,
  BatchPlanJournal,
} from "./types";
import { readBatchPlanJournal, writeBatchPlanJournal, readBatchPlanForScopeRun, linkBatchPlanJournal } from "./journal";
import {
  guardNotebookForAiWrite,
  guardPageForAiWrite,
} from "@/lib/notebook-ai/pageWriteGuard";
import { useNotebooks } from "@/stores/useNotebooks";
import { v4 as uuidv4 } from "uuid";
import { usePages } from "@/stores/usePages";
import {
  validateInput,
  invalidJournal,
  convertPartialEditsInPlan,
  expandDeletePageIds,
} from "./batchValidation";
import { makeLocalPlanPaths } from "./batchLocalPlanPaths";
import { clone } from "./batchShared";
import { checkOperationScope, type RunWriteScope } from "../resourceScope";
import { bindOperationTargets } from "./batchTargets";
import { withBatchPreparationLock } from "./batchPreparationLock";

interface PrepareParams {
  toolCallId: string;
  runId: string;
  notebookId: string;
  input: BatchPlanInput;
  writeScope?: RunWriteScope;
}

export function prepareBatchPlan(params: PrepareParams): Promise<BatchPlanPrepareResult> {
  const prepare = async () => {
    const result = await prepareBatchPlanOnce(params);
    if (!result.journal || result.journal.status !== "invalid" || result.journal.requestedInputSignature) return result;
    const journal = writeBatchPlanJournal({ ...result.journal, version: 2,
      writeScope: params.writeScope ? clone(params.writeScope) : undefined,
      requestedInputSignature: JSON.stringify(params.input) });
    return { ...result, journal };
  };
  const toolKey = JSON.stringify(["tool", params.toolCallId, params.runId]);
  return withBatchPreparationLock(toolKey, () => params.writeScope
    ? withBatchPreparationLock(JSON.stringify(["scope", params.writeScope.runId, params.runId]), prepare)
    : prepare());
}

async function prepareBatchPlanOnce(params: PrepareParams): Promise<BatchPlanPrepareResult> {
  const existing = readBatchPlanJournal(params.toolCallId, params.runId) ??
    (params.writeScope ? readBatchPlanForScopeRun(params.writeScope.runId, params.runId) : null);
  const requestedInputSignature = JSON.stringify(params.input);
  if (existing) {
    if (existing.writeScope?.runId !== params.writeScope?.runId)
      return { ok: false, error: "工具调用已绑定其他会话写入范围，请使用新的调用标识", journal: existing };
    if (existing.requestedInputSignature && existing.requestedInputSignature !== requestedInputSignature)
      return { ok: false, error: "runId 已绑定其他冻结计划，请使用新的 runId", journal: existing };
    linkBatchPlanJournal(params.toolCallId, existing);
    return existing.status === "invalid"
      ? { ok: false, error: existing.error || "计划无效", journal: existing }
      : { ok: true, journal: existing };
  }
  const inputError = validateInput(params.input);
  const notebookGuard = guardNotebookForAiWrite(params.notebookId);
  if (inputError || !notebookGuard.ok) {
    const error =
      inputError ??
      (!notebookGuard.ok ? notebookGuard.error : "目标笔记本不可写入");
    const journal = writeBatchPlanJournal(
      invalidJournal(
        params.toolCallId,
        params.runId,
        params.notebookId,
        params.input,
        error,
      ),
    );
    return { ok: false, error: journal.error!, journal };
  }

  let bound: ReturnType<typeof bindOperationTargets>;
  try {
    const converted = convertPartialEditsInPlan(params.input, params.notebookId);
    bound = bindOperationTargets(converted, params.notebookId, params.writeScope);
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作目的地无效";
    const journal = writeBatchPlanJournal(invalidJournal(params.toolCallId, params.runId,
      params.notebookId, params.input, message));
    return { ok: false, error: message, journal };
  }
  const planInput = bound.input;

  const before: Record<string, FrozenPageSnapshot> = {};
  const affectedPageIdsByOperationId: Record<string, string[]> = {};
  let localPlanPaths: Awaited<ReturnType<typeof makeLocalPlanPaths>>;
  try {
    localPlanPaths = await makeLocalPlanPaths(params.notebookId, planInput);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "本地文件计划准备失败";
    const journal = writeBatchPlanJournal(
      invalidJournal(
        params.toolCallId,
        params.runId,
        params.notebookId,
        planInput,
        message,
      ),
    );
    return { ok: false, error: message, journal };
  }
  const deleteBatchIdsByOperationId: Record<string, string> = {
    ...localPlanPaths.deleteBatchIdsByOperationId,
  };
  const plannedPageIds: Record<string, string> = {};
  const operationOwnerByPageId = new Map<string, string>();
  for (const operation of planInput.operations) {
    const notebookId = bound.targets[operation.operationId]!.notebookId;
    if (
      operation.type === "create" &&
      useNotebooks.getState().notebooks[notebookId]?.source !==
        "local-folder"
    )
      plannedPageIds[operation.operationId] = uuidv4();
    if (operation.type === "create" && operation.parentId) {
      const parent = usePages.getState().pages[operation.parentId];
      if (
        !parent ||
        parent.workspaceId !== notebookId ||
        Boolean(parent.trashedAt)
      ) {
        const message = "新页面的父级不存在、已在垃圾箱中或不属于当前笔记本";
        const journal = writeBatchPlanJournal(
          invalidJournal(
            params.toolCallId,
            params.runId,
            params.notebookId,
            planInput,
            message,
          ),
        );
        return { ok: false, error: message, journal };
      }
    }
    if (operation.type === "delete") {
      const requestedIds = new Set(operation.pageIds);
      for (const pageId of operation.pageIds) {
        const page = usePages.getState().pages[pageId];
        if (
          !page ||
          page.workspaceId !== notebookId ||
          Boolean(page.trashedAt)
        ) {
          const message = "删除目标不存在、已在垃圾箱中或不属于当前笔记本";
          const journal = writeBatchPlanJournal(
            invalidJournal(
              params.toolCallId,
              params.runId,
              params.notebookId,
              planInput,
              message,
            ),
          );
          return { ok: false, error: message, journal };
        }
        let parentId = page.parentId;
        while (parentId) {
          if (requestedIds.has(parentId)) {
            const message = "删除目标包含重复的父子页面，请只保留父页面";
            const journal = writeBatchPlanJournal(
              invalidJournal(
                params.toolCallId,
                params.runId,
                params.notebookId,
                planInput,
                message,
              ),
            );
            return { ok: false, error: message, journal };
          }
          parentId = usePages.getState().pages[parentId]?.parentId;
        }
      }
    }
    const pageIds =
      operation.type === "edit" || operation.type === "search_replace"
        ? [operation.pageId]
        : operation.type === "delete"
          ? expandDeletePageIds(notebookId, operation.pageIds)
          : [];
    if (operation.type === "delete" && params.writeScope) {
      const error = checkOperationScope({ ...operation, pageIds },
        bound.targets[operation.operationId]!, params.writeScope, params.notebookId);
      if (error) return { ok: false, error, journal: writeBatchPlanJournal(invalidJournal(
        params.toolCallId, params.runId, params.notebookId, planInput, error)) };
    }
    if (operation.type === "delete")
      affectedPageIdsByOperationId[operation.operationId] = pageIds;
    if (
      operation.type === "delete" &&
      !deleteBatchIdsByOperationId[operation.operationId]
    )
      deleteBatchIdsByOperationId[operation.operationId] =
        `ai-batch-${params.runId}-${uuidv4()}`;
    for (const pageId of pageIds) {
      const owner = operationOwnerByPageId.get(pageId);
      const allowSharedSearchReplace =
        operation.type === "search_replace" &&
        owner?.startsWith("search_replace:");
      if (
        owner &&
        owner !== operation.operationId &&
        !allowSharedSearchReplace
      ) {
        const message = "编辑或删除操作的目标页面树发生重叠";
        const journal = writeBatchPlanJournal(
          invalidJournal(
            params.toolCallId,
            params.runId,
            params.notebookId,
            planInput,
            message,
          ),
        );
        return { ok: false, error: message, journal };
      }
      operationOwnerByPageId.set(
        pageId,
        operation.type === "search_replace"
          ? `search_replace:${operation.operationId}`
          : operation.operationId,
      );
      const guard = guardPageForAiWrite(pageId, {
        expectedNotebookId: notebookId,
      });
      if (!guard.ok) {
        const journal = writeBatchPlanJournal(
          invalidJournal(
            params.toolCallId,
            params.runId,
            params.notebookId,
            planInput,
            guard.error,
          ),
        );
        return { ok: false, error: guard.error, journal };
      }
      before[pageId] = {
        pageId,
        page: clone(guard.page),
        revision: {
          updatedAt: guard.updatedAt,
          contentSignature: guard.contentSignature,
        },
      };
    }
  }
  const now = Date.now();
  const journal: BatchPlanJournal = {
    version: 2,
    writeScope: params.writeScope ? clone(params.writeScope) : undefined,
    operationTargets: bound.targets,
    requestedInputSignature,
    toolCallId: params.toolCallId,
    runId: params.runId,
    notebookId: params.notebookId,
    input: clone(planInput),
    selectedOperationIds: planInput.operations.map(
      (operation) => operation.operationId,
    ),
    status: "prepared",
    before,
    affectedPageIdsByOperationId,
    deleteBatchIdsByOperationId,
    plannedPageIds,
    plannedLocalPaths: localPlanPaths.plannedLocalPaths,
    localPathAfterByPageId: {},
    localTrashPathsByPageId: localPlanPaths.localTrashPathsByPageId,
    after: {},
    createdPageIds: {},
    results: [],
    createdAt: now,
    updatedAt: now,
  };
  return { ok: true, journal: writeBatchPlanJournal(journal) };
}
