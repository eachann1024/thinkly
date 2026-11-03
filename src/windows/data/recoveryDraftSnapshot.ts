import {
  getRecoveryEntry,
  listRecoveryEntries,
  type RecoveryJournalEntry,
  type RecoverySource,
} from "@/lib/storage/recoveryJournal";
import { usePages } from "@/stores/usePages";
import { useQuickNote } from "@/stores/useQuickNote";
import { registerMainSnapshot } from "./mainSnapshot";
import type { RecoveryDraftPage, RecoveryDraftSnapshot } from "@/windows/views/recovery/recoveryDraftModel";

export const RECOVERY_DRAFTS_SNAPSHOT = "recovery-drafts";

function pageView(pageId: string, entry: RecoveryJournalEntry): RecoveryDraftPage | null {
  const live = usePages.getState().pages[pageId];
  const source = live ?? entry.draftPage;
  if (!source) return null;
  return {
    id: source.id,
    content: source.content,
    isFolder: Boolean(source.isFolder),
    trashedAt: source.trashedAt,
    localFilePath: source.localFilePath,
  };
}

export function readRecoveryDraftSnapshot(): RecoveryDraftSnapshot {
  const entries = listRecoveryEntries().sort((left, right) => right.updatedAt - left.updatedAt);
  const pages: Record<string, RecoveryDraftPage> = {};
  for (const entry of entries) {
    if (entry.source === "quicknote") continue;
    const page = pageView(entry.id, entry);
    if (page) pages[entry.id] = page;
  }
  const names = useQuickNote.getState().slotNames;
  return {
    entries,
    pages,
    slotNames: {
      "1": names[1] ?? "",
      "2": names[2] ?? "",
      "3": names[3] ?? "",
      "4": names[4] ?? "",
      "5": names[5] ?? "",
    },
  };
}

export function readRecoveryDraftEntry(
  source: RecoverySource,
  id: string,
): RecoveryJournalEntry | null {
  return getRecoveryEntry(source, id);
}

export function registerRecoveryDraftSnapshot(): void {
  registerMainSnapshot(RECOVERY_DRAFTS_SNAPSHOT, readRecoveryDraftSnapshot);
}
