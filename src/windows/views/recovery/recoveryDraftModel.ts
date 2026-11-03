import { getPageTitle } from "@/components/editor/utils/page-title";
import type { RecoveryJournalEntry, RecoverySource } from "@/lib/storage/recoveryJournal";
import type { Page } from "@/types";

export type RecoveryDraftPage = Pick<Page, "id" | "content" | "isFolder" | "trashedAt" | "localFilePath">;

export type RecoveryDraftSnapshot = {
  entries: RecoveryJournalEntry[];
  pages: Record<string, RecoveryDraftPage>;
  slotNames: Record<string, string>;
};

export type RecoveryDraftStatus = "loading" | "ready" | "unavailable" | "stale" | "expired";

export function recoveryEntryKey(entry: RecoveryJournalEntry): string {
  return `${entry.source}:${entry.id}:${entry.revision}`;
}

export function recoverySourceKey(source: RecoverySource): "sourceQuicknote" | "sourceLocal" | "sourceInternal" {
  if (source === "quicknote") return "sourceQuicknote";
  if (source === "local-file") return "sourceLocal";
  return "sourceInternal";
}

export function recoveryDraftTitle(
  entry: RecoveryJournalEntry,
  snapshot: RecoveryDraftSnapshot,
  fallback: string,
): string {
  if (entry.source === "quicknote") {
    const name = snapshot.slotNames[entry.id]?.trim();
    return name || fallback;
  }
  const page = snapshot.pages[entry.id] ?? entry.draftPage;
  if (!page) return entry.id;
  return getPageTitle(page as Page);
}

export function recoveryPageCanOpen(page: RecoveryDraftPage | undefined): boolean {
  return Boolean(page && !page.isFolder && !page.trashedAt);
}

export function recoverySlotNumber(id: string): number | null {
  const slot = Number(id);
  return Number.isInteger(slot) && slot >= 1 && slot <= 5 ? slot : null;
}
