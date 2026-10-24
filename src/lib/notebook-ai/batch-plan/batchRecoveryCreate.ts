import { operationNotebookId } from "./batchTargets";
import type { BatchPlanInput, BatchPlanJournal } from "./types";
import { usePages } from "@/stores/usePages";
import { writeBatchPlanJournal } from "./journal";
import { getPageContentSignature } from "@/lib/notebook-ai/pageWriteGuard";
import { pageAtLocalPath, pathExists } from "./batchPaths";
import { plannedContent } from "./batchPlannedContent";
import { appendRecoveredSuccess, revisionOf, sameRevision } from "./batchShared";

export async function recoverCreatedOperation(
  operation: Extract<BatchPlanInput["operations"][number], { type: "create" }>,
  journal: BatchPlanJournal,
): Promise<BatchPlanJournal> {
  const operationId = operation.operationId;

  const plannedLocalPath = journal.plannedLocalPaths[operationId];
  const plannedPageId = journal.plannedPageIds[operationId];
  const page = plannedLocalPath
    ? pageAtLocalPath(plannedLocalPath)
    : plannedPageId
      ? usePages.getState().pages[plannedPageId]
      : undefined;
  if (!page)
    if (plannedLocalPath && (await pathExists(plannedLocalPath))) {
      return writeBatchPlanJournal({
        ...journal,
        status: "failed",
        error: "中断创建的本地文件已存在但尚未安全载入，已停止恢复",
        executingOperationId: undefined,
        executingStartedAt: undefined,
      });
    }
  if (!page)
    return writeBatchPlanJournal({
      ...journal,
      executingOperationId: undefined,
      executingStartedAt: undefined,
    });
  // A path plus matching content cannot prove exclusive-create ownership: another
  // writer may have won wx. Without the application's committed receipt, preserve
  // the file and require reconciliation rather than claiming it (and later deleting it).
  if (plannedLocalPath && (journal.createdPageIds[operationId] !== page.id ||
      !journal.after[page.id] || !sameRevision(revisionOf(page), journal.after[page.id]!))) {
    return writeBatchPlanJournal({ ...journal, status: "failed",
      error: "中断创建的本地文件缺少本次创建回执，保留文件且未认定成功，请核对后重新绑定",
      executingOperationId: undefined, executingStartedAt: undefined });
  }
  const expected = getPageContentSignature(plannedContent(operation, journal));
  if (
    page.workspaceId !== operationNotebookId(journal, operation) ||
    getPageContentSignature(page.content) !== expected
  ) {
    return writeBatchPlanJournal({
      ...journal,
      status: "failed",
      error: "中断创建页与冻结计划不一致，已停止恢复",
      executingOperationId: undefined,
      executingStartedAt: undefined,
    });
  }
  return appendRecoveredSuccess(
    journal,
    { operationId, type: "create", ok: true, pageIds: [page.id] },
    { [page.id]: revisionOf(page) },
    page.id,
  );
}
