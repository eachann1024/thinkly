type PendingDraft = { flush: () => void; cancel: () => void };
const pendingDrafts = new Map<string, Set<PendingDraft>>();

export function registerNotebookAiDraft(notebookId: string, pending: PendingDraft) {
  let drafts = pendingDrafts.get(notebookId);
  if (!drafts) { drafts = new Set(); pendingDrafts.set(notebookId, drafts); }
  drafts.add(pending);
  return () => {
    drafts.delete(pending);
    if (drafts.size === 0) pendingDrafts.delete(notebookId);
  };
}

export function cancelNotebookAiDrafts(notebookId?: string) {
  const groups = notebookId === undefined ? pendingDrafts.values() : [pendingDrafts.get(notebookId)];
  for (const drafts of groups) for (const draft of drafts ?? []) draft.cancel();
}
