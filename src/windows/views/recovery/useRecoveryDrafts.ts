import { useCallback, useEffect, useState } from "react";
import {
  requestMainSnapshot,
  requestMainSnapshotResult,
} from "@/windows/data/mainSnapshot";
import { RECOVERY_DRAFTS_SNAPSHOT } from "@/windows/data/recoveryDraftSnapshot";
import type { RecoveryJournalEntry } from "@/lib/storage/recoveryJournal";
import {
  recoveryEntryKey,
  type RecoveryDraftSnapshot,
  type RecoveryDraftStatus,
} from "./recoveryDraftModel";

export const RECOVERY_DRAFT_ENTRY_SNAPSHOT = "recovery-draft-entry";

type EntryLookup = { source: RecoveryJournalEntry["source"]; id: string };

export function useRecoveryDrafts() {
  const [snapshot, setSnapshot] = useState<RecoveryDraftSnapshot | null>(null);
  const [status, setStatus] = useState<RecoveryDraftStatus>("loading");
  const [selectedKey, setSelectedKey] = useState("");

  const refresh = useCallback(async () => {
    const response = await requestMainSnapshotResult<RecoveryDraftSnapshot>(RECOVERY_DRAFTS_SNAPSHOT);
    if (!response.ok) {
      setStatus("unavailable");
      return null;
    }
    const next = response.value ?? { entries: [], pages: {}, slotNames: {} };
    setSnapshot(next);
    setStatus("ready");
    setSelectedKey((current) => {
      if (next.entries.some((entry) => recoveryEntryKey(entry) === current)) return current;
      return next.entries[0] ? recoveryEntryKey(next.entries[0]) : "";
    });
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = snapshot?.entries.find((entry) => recoveryEntryKey(entry) === selectedKey) ?? null;

  const verifyCurrent = useCallback(async (entry: RecoveryJournalEntry) => {
    const current = await requestMainSnapshot<RecoveryJournalEntry | null>(
      RECOVERY_DRAFT_ENTRY_SNAPSHOT,
      2,
      { source: entry.source, id: entry.id } satisfies EntryLookup,
    );
    if (current && current.revision === entry.revision && current.source === entry.source && current.id === entry.id) {
      return true;
    }
    setStatus(current ? "stale" : "expired");
    return false;
  }, []);

  return { snapshot, status, selected, setSelectedKey, refresh, verifyCurrent, setStatus };
}
