import { readDbStorageJSON, writeDbStorageJSON } from "@/lib/storage";
import type { BatchPlanJournal } from "./types";

const KEY_PREFIX = "gn:notebook-ai:batch-plan:";

export function batchPlanJournalKey(toolCallId: string, runId: string) {
  return `${KEY_PREFIX}${toolCallId}:${runId}`;
}

export function readBatchPlanJournal(
  toolCallId: string,
  runId: string,
): BatchPlanJournal | null {
  const stored = readDbStorageJSON<BatchPlanJournal | string | null>(batchPlanJournalKey(toolCallId, runId), null);
  const journal = typeof stored === "string" ? readDbStorageJSON<BatchPlanJournal | null>(stored, null) : stored;
  if (!journal || (journal.version !== 1 && journal.version !== 2)) return null;
  return {
    ...journal,
    input: journal.version === 1 ? { ...journal.input, operations: journal.input.operations.map(
      ({ target: _target, ...operation }) => operation) } : journal.input,
    operationTargets: journal.version === 2 ? journal.operationTargets ?? {} : undefined,
    writeScope: journal.version === 2 ? journal.writeScope : undefined,
    affectedPageIdsByOperationId: journal.affectedPageIdsByOperationId ?? {},
    deleteBatchIdsByOperationId: journal.deleteBatchIdsByOperationId ?? {},
    plannedPageIds: journal.plannedPageIds ?? {},
    plannedLocalPaths: journal.plannedLocalPaths ?? {},
    localPathAfterByPageId: journal.localPathAfterByPageId ?? {},
    localTrashPathsByPageId: journal.localTrashPathsByPageId ?? {},
  };
}

export function writeBatchPlanJournal(
  journal: BatchPlanJournal,
): BatchPlanJournal {
  const next = { ...journal, updatedAt: Date.now() };
  writeDbStorageJSON(batchPlanJournalKey(next.toolCallId, next.runId), next);
  if (next.version === 2 && next.writeScope) {
    writeDbStorageJSON(`${KEY_PREFIX}run:${next.writeScope.runId}:${next.runId}`,
      { toolCallId: next.toolCallId, runId: next.runId });
  }
  return next;
}

export function updateBatchPlanSelection(
  toolCallId: string,
  runId: string,
  selectedOperationIds: string[],
): BatchPlanJournal | null {
  const journal = readBatchPlanJournal(toolCallId, runId);
  if (!journal) return null;
  const allowed = new Set(
    journal.input.operations.map((operation) => operation.operationId),
  );
  const unique = [...new Set(selectedOperationIds)].filter((id) =>
    allowed.has(id),
  );
  return writeBatchPlanJournal({ ...journal, selectedOperationIds: unique });
}

export function readBatchPlanForScopeRun(scopeRunId: string, runId: string) {
  const ref = readDbStorageJSON<{ toolCallId: string; runId: string } | null>(
    `${KEY_PREFIX}run:${scopeRunId}:${runId}`, null);
  return ref ? readBatchPlanJournal(ref.toolCallId, ref.runId) : null;
}
export function linkBatchPlanJournal(toolCallId: string, journal: BatchPlanJournal) {
  if (toolCallId !== journal.toolCallId) writeDbStorageJSON(batchPlanJournalKey(toolCallId, journal.runId),
    batchPlanJournalKey(journal.toolCallId, journal.runId));
}
