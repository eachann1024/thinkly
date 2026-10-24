import { useNotebooks } from "@/stores/useNotebooks";
import { isRunWriteScopeRevoked } from "../resourceScope";
import type { BatchPlanJournal } from "./types";
import { writeBatchPlanJournal } from "./journal";
import { resultForOperation } from "./batchShared";
import { recoverCreatedOperation } from "./batchRecoveryCreate";
import {
  recoverEditedOperation,
  recoverSearchReplaceOperation,
} from "./batchRecoveryEdit";
import { recoverDeletedOperation } from "./batchRecoveryDelete";

/** 将崩溃时已写 intent、但还来不及记录 result 的操作安全归类。 */
export async function recoverInterruptedOperation(
  journal: BatchPlanJournal,
): Promise<BatchPlanJournal> {
  const operationId = journal.executingOperationId;
  if (!operationId) return journal;
  const operation = journal.input.operations.find(
    (item) => item.operationId === operationId,
  );
  if (!operation) {
    return writeBatchPlanJournal({
      ...journal,
      status: "failed",
      error: "执行日志指向不存在的操作",
      executingOperationId: undefined,
      executingStartedAt: undefined,
    });
  }
  const target = journal.operationTargets?.[operationId];
  if (journal.version === 2 && (!target ||
      !useNotebooks.getState().notebooks[target.notebookId] ||
      useNotebooks.getState().notebooks[target.notebookId]?.localPath !== target.notebookRoot ||
      (journal.writeScope && isRunWriteScopeRevoked(journal.writeScope)))) {
    return writeBatchPlanJournal({ ...journal, status: "failed",
      error: "中断任务的写入范围已撤销或笔记本位置变化，未继续恢复" });
  }
  if (resultForOperation(journal, operationId)) {
    return writeBatchPlanJournal({
      ...journal,
      executingOperationId: undefined,
      executingStartedAt: undefined,
    });
  }
  if (operation.type === "create")
    return recoverCreatedOperation(operation, journal);
  if (operation.type === "edit")
    return recoverEditedOperation(operation, journal);
  if (operation.type === "search_replace")
    return recoverSearchReplaceOperation(operation, journal);
  if (operation.type !== "delete") {
    return writeBatchPlanJournal({
      ...journal,
      status: "failed",
      error: "中断操作类型暂不支持恢复",
      executingOperationId: undefined,
      executingStartedAt: undefined,
    });
  }
  return recoverDeletedOperation(operation, journal);
}
