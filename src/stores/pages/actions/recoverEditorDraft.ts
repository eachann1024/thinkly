import type { Page } from "@/types";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";
import { validRecoverySettings } from "@/lib/storage/localRecoverySettings";

export function recoverEditorDraft(entry: RecoveryJournalEntry): Page | null {
  const page = entry.draftPage;
  if (!page?.editorDraft || page.id !== entry.id || !page.workspaceId || page.isFolder || !validRecoverySettings(entry.settings)) return null;
  return {
    ...page,
    ...entry.settings,
    content: entry.content ?? page.content,
    updatedAt: Math.max(page.updatedAt, entry.updatedAt),
  };
}
