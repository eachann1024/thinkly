import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { buildRecoveryDraftExport } from "@/lib/recoveryDrafts";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { openPageInMain } from "@/windows/AuxiliaryWindowContext";
import { recoveryPageCanOpen, recoverySlotNumber, type RecoveryDraftSnapshot } from "./recoveryDraftModel";

export async function exportRecoveryDraft(
  entry: RecoveryJournalEntry,
  stillCurrent: () => Promise<boolean>,
  notice: (kind: "started" | "failed" | "stale") => void,
): Promise<void> {
  if (!await stillCurrent()) {
    notice("stale");
    return;
  }
  try {
    const file = buildRecoveryDraftExport(entry);
    const blob = new Blob([file.json], { type: "application/json;charset=utf-8" });
    if (!await stillCurrent()) {
      notice("stale");
      return;
    }
    const saved = await saveBlobAndReveal(blob, file.filename);
    if (!saved) throw new Error("export");
    notice("started");
  } catch (error) {
    console.error("[recovery-drafts] export failed", error);
    notice("failed");
  }
}

export async function openRecoveryTarget(
  entry: RecoveryJournalEntry,
  snapshot: RecoveryDraftSnapshot,
  unavailable: () => void,
): Promise<void> {
  if (entry.source === "quicknote") {
    const slot = recoverySlotNumber(entry.id);
    const show = getGooseDesktop()?.showQuicknote;
    if (!slot || !show || !await show(slot).catch(() => false)) unavailable();
    return;
  }
  if (!recoveryPageCanOpen(snapshot.pages[entry.id])) {
    unavailable();
    return;
  }
  if (!await openPageInMain(entry.id)) unavailable();
}
