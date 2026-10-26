import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/quicknote/recovery.ts#block1:1">`
zh-Hans:
  quicknoteRecoveryFailed: "速记恢复备份写入失败"
  keepQuicknoteOpen: "请暂时不要关闭小窗，并复制重要内容后重试。"
  quicknoteNotSaved: "速记暂未保存"
  quicknoteRetry: "当前草稿已放入恢复备份，可点击重试。"
  retry: "重试"
  retryQuicknoteRecovery: "重试备份"
en:
  quicknoteRecoveryFailed: "Couldn’t write the Quick Note recovery backup"
  keepQuicknoteOpen: "Keep the Quick Note window open. Copy any important content, then try again."
  quicknoteNotSaved: "Quick Note has not been saved"
  quicknoteRetry: "The current draft was saved to a recovery backup. Click Retry to try saving again."
  retry: "Retry"
  retryQuicknoteRecovery: "Retry backup"
ja:
  quicknoteRecoveryFailed: "クイックノートの復元用バックアップを書き込めませんでした"
  keepQuicknoteOpen: "ミニウインドウを閉じずに、重要な内容をコピーしてからもう一度お試しください。"
  quicknoteNotSaved: "クイックノートは未保存です"
  quicknoteRetry: "現在の下書きは復元用バックアップに保存されています。「再試行」をクリックしてください。"
  retry: "再試行"
  retryQuicknoteRecovery: "バックアップを再試行"
`);
import { QUICKNOTE_SLOTS, type QuickNoteSlot, type QuickNoteDrafts } from "./types";
import type { JSONContent } from "@/types";
import {
  recordRecoveryEntry,
  listRecoveryEntries,
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { dismissSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { showSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { normalizeDrafts, normalizeSlot } from "./normalization";
import type { StateStorage } from "zustand/middleware";
import { localStorageAdapter, setDbStorageItem } from "@/lib/storage";
import { useQuickNote } from "../useQuickNote";

export const pendingQuickNoteRecoveryRevisions = new Map<
  QuickNoteSlot,
  number
>();
const quickNoteDraftRevisions = new Map<QuickNoteSlot, number>();

export const getQuickNoteDraftRevision = (slot: QuickNoteSlot): number =>
  quickNoteDraftRevisions.get(slot) ?? 0;

let retryingQuickNoteSave = false;
let quickNoteRetryFailed = false;

const retryQuickNoteSave = () => {
  quickNoteRetryFailed = false;
  retryingQuickNoteSave = true;
  try {
    useQuickNote.setState((state) => ({ drafts: { ...state.drafts } }));
  } finally {
    retryingQuickNoteSave = false;
  }
  if (quickNoteRetryFailed) throw new Error(storeText("quicknoteNotSaved"));
};

export const recordQuickNoteRecovery = (
  slot: QuickNoteSlot,
  previous: JSONContent | null,
  content: JSONContent | null,
): void => {
  quickNoteDraftRevisions.set(slot, getQuickNoteDraftRevision(slot) + 1);
  const entry = recordRecoveryEntry({
    source: "quicknote",
    id: String(slot),
    content,
    baseSignature: getContentSignature(previous),
  });
  if (entry) {
    pendingQuickNoteRecoveryRevisions.set(slot, entry.revision);
    dismissSaveRecoveryNotice(`goose-quicknote-journal-failed:${slot}`);
    return;
  }
  showSaveRecoveryNotice({
    id: `goose-quicknote-journal-failed:${slot}`,
    title: storeText("quicknoteRecoveryFailed"),
    description: storeText("keepQuicknoteOpen"),
    retryLabel: storeText("retryQuicknoteRecovery"),
    onRetry: () => {
      const latestContent = useQuickNote.getState().drafts[slot] ?? null;
      const retried = recordRecoveryEntry({
        source: "quicknote",
        id: String(slot),
        content: latestContent,
        baseSignature: getContentSignature(previous),
      });
      if (!retried) throw new Error(storeText("quicknoteRecoveryFailed"));
      pendingQuickNoteRecoveryRevisions.set(slot, retried.revision);
    },
  });
};

export function recoverQuickNoteDrafts(draftsRaw: unknown): {
  drafts: QuickNoteDrafts;
  recoveredSlots: QuickNoteSlot[];
  conflictSlots: QuickNoteSlot[];
} {
  const drafts = normalizeDrafts(draftsRaw);
  const recoveredSlots: QuickNoteSlot[] = [];
  const conflictSlots: QuickNoteSlot[] = [];
  for (const entry of listRecoveryEntries("quicknote")) {
    const slot = normalizeSlot(entry.id);
    quickNoteDraftRevisions.set(slot, getQuickNoteDraftRevision(slot) + 1);
    const current = drafts[slot];
    const alreadyCurrent =
      getContentSignature(current) === getContentSignature(entry.content);
    if (alreadyCurrent) {
      if (
        !acknowledgeRecoveryEntry("quicknote", String(slot), entry.revision)
      ) {
        pendingQuickNoteRecoveryRevisions.set(slot, entry.revision);
      }
      continue;
    }
    if (!canApplyRecoveryEntry(entry, current)) {
      conflictSlots.push(slot);
      continue;
    }
    drafts[slot] = entry.content;
    recoveredSlots.push(slot);
    pendingQuickNoteRecoveryRevisions.set(slot, entry.revision);
  }
  return { drafts, recoveredSlots, conflictSlots };
}

export const quickNoteStorage: StateStorage = {
  getItem: (name) => localStorageAdapter.getItem(name),
  setItem: (name, value) => {
    const saved = setDbStorageItem(name, value);
    if (saved) {
      for (const [slot, revision] of pendingQuickNoteRecoveryRevisions) {
        const acknowledged = acknowledgeRecoveryEntry(
          "quicknote",
          String(slot),
          revision,
        );
        if (
          acknowledged &&
          pendingQuickNoteRecoveryRevisions.get(slot) === revision
        ) {
          pendingQuickNoteRecoveryRevisions.delete(slot);
          dismissSaveRecoveryNotice(`goose-quicknote-journal-failed:${slot}`);
        }
      }
      for (const slot of QUICKNOTE_SLOTS) {
        dismissSaveRecoveryNotice(`goose-quicknote-journal-failed:${slot}`);
      }
      dismissSaveRecoveryNotice("goose-quicknote-save-failed");
      return;
    }
    if (retryingQuickNoteSave) quickNoteRetryFailed = true;
    showSaveRecoveryNotice({
      id: "goose-quicknote-save-failed",
      title: storeText("quicknoteNotSaved"),
      description: storeText("quicknoteRetry"),
      retryLabel: storeText("retry"),
      onRetry: retryQuickNoteSave,
    });
  },
  removeItem: (name) => localStorageAdapter.removeItem(name),
};
