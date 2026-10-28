import { v4 as uuidv4 } from "uuid";
import { usePages } from "@/stores/usePages";
import { prepareBatchPlan } from "./batchPrepare";
import { writeBatchPlanJournal } from "./journal";
import { clone, revisionOf, sameRevision } from "./batchShared";
import { validateFrozenOperationTarget } from "./batchTargets";
import type { BatchPlanJournal, PageRevision } from "./types";

/** Explicit user action: keep the old run revoked and grant only this replay. */
export async function prepareReapplication(journal: BatchPlanJournal): Promise<BatchPlanJournal> {
  if (journal.status !== "undone") throw new Error("只有已撤回的计划可以重新应用");
  const replayId = `reapply-${uuidv4()}`;
  const writeScope = journal.writeScope
    ? { ...clone(journal.writeScope), runId: replayId, revoked: false }
    : undefined;
  const selected = new Set(journal.selectedOperationIds);
  const operations = journal.input.operations.filter((item) => selected.has(item.operationId));
  if (!operations.length) throw new Error("没有可重新应用的操作");
  const validation = { ...journal, writeScope };
  const restoredRevisions = new Map<string, PageRevision>();
  for (const operation of operations) {
    const error = await validateFrozenOperationTarget(validation, operation);
    if (error) throw new Error(error);
    const ids = operation.type === "create" ? [] : operation.type === "delete"
      ? journal.affectedPageIdsByOperationId[operation.operationId] ?? operation.pageIds
      : [operation.pageId];
    for (const id of ids) {
      const before = journal.before[id];
      const current = usePages.getState().pages[id];
      // Undo changes timestamps. Compare restored contents and identity instead.
      if (!before || !current || current.trashedAt ||
          current.workspaceId !== before.page.workspaceId ||
          current.parentId !== before.page.parentId ||
          current.localFilePath !== before.page.localFilePath ||
          revisionOf(current).contentSignature !== before.revision.contentSignature) {
        throw new Error("页面在撤回后已变化，拒绝覆盖，请重新生成计划");
      }
      restoredRevisions.set(id, revisionOf(current));
    }
  }
  const prepared = await prepareBatchPlan({
    toolCallId: journal.toolCallId, runId: replayId, notebookId: journal.notebookId,
    input: { ...journal.input, operations }, writeScope,
  });
  if (!prepared.ok) throw new Error(prepared.error);
  if (Object.keys(prepared.journal.before).length !== restoredRevisions.size ||
      Object.entries(prepared.journal.before).some(([id, snapshot]) => {
        const expected = restoredRevisions.get(id);
        return !expected || !sameRevision(snapshot.revision, expected);
      }) || operations.some((operation) => journal.version === 2 &&
        JSON.stringify(prepared.journal.operationTargets?.[operation.operationId]) !==
        JSON.stringify(journal.operationTargets?.[operation.operationId]))) {
    throw new Error("页面或目标位置在重新应用准备期间已变化，拒绝覆盖");
  }
  // The existing conversation card retains its identity; fresh snapshots and
  // operation IDs/paths are used by the normal executor and subsequent undo.
  return writeBatchPlanJournal({ ...prepared.journal, runId: journal.runId });
}
