import type { Page } from "@/types";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";

/** 新文件尚未落盘时，恢复日志携带足够身份信息供编辑器重开并重试保存。 */
export function recoverEditorDraft(entry: RecoveryJournalEntry): Page | null {
  const page = entry.draftPage;
  if (!page?.editorDraft || page.id !== entry.id || !page.workspaceId || page.isFolder) return null;
  return {
    ...page,
    content: entry.content ?? page.content,
    updatedAt: Math.max(page.updatedAt, entry.updatedAt),
  };
}
