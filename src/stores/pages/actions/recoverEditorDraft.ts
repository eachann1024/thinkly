import type { Page } from "@/types";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";

export function recoverEditorDraft(entry: RecoveryJournalEntry): Page | null {
  const page = entry.draftPage;
  if (!page?.editorDraft || page.id !== entry.id || !page.workspaceId || page.isFolder) return null;
  return {
    ...page,
    content: entry.content ?? page.content,
    updatedAt: Math.max(page.updatedAt, entry.updatedAt),
  };
}
