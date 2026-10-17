import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/quicknote/recovery.ts#block1:1">`
zh-Hans:
  quicknoteRecoveryFailed: "速记恢复备份写入失败"
  keepQuicknoteOpen: "请暂时不要关闭小窗，并复制重要内容后重试。"
  quicknoteNotSaved: "速记暂未保存"
  quicknoteRetry: "当前草稿已放入恢复备份，可点击重试。"
  retry: "重试"
en:
  quicknoteRecoveryFailed: "Couldn’t write the Quick Note recovery backup"
  keepQuicknoteOpen: "Keep the Quick Note window open. Copy any important content, then try again."
  quicknoteNotSaved: "Quick Note has not been saved"
  quicknoteRetry: "The current draft was saved to a recovery backup. Click Retry to try saving again."
  retry: "Retry"
`);
import type { QuickNoteSlot, QuickNoteDrafts } from "./types";
import type { JSONContent } from "@/types";
import {
  recordRecoveryEntry,
  listRecoveryEntries,
  acknowledgeRecoveryEntry,
  canApplyRecoveryEntry,
} from "@/lib/storage/recoveryJournal";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { toast } from "@/components/ui/sonner";
import { normalizeDrafts, normalizeSlot } from "./normalization";
import type { StateStorage } from "zustand/middleware";
import { localStorageAdapter, setDbStorageItem } from "@/lib/storage";
import { useQuickNote } from "../useQuickNote";

export const pendingQuickNoteRecoveryRevisions = new Map<
  QuickNoteSlot,
  number
>();

export const recordQuickNoteRecovery = (
  slot: QuickNoteSlot,
  previous: JSONContent | null,
  content: JSONContent | null,
): void => {
  const entry = recordRecoveryEntry({
    source: "quicknote",
    id: String(slot),
    content,
    baseSignature: getContentSignature(previous),
  });
  if (entry) {
    pendingQuickNoteRecoveryRevisions.set(slot, entry.revision);
    return;
  }
  toast.error(storeText("quicknoteRecoveryFailed"), {
    id: "goose-quicknote-journal-failed",
    description: storeText("keepQuicknoteOpen"),
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
        }
      }
      return;
    }
    toast.error(storeText("quicknoteNotSaved"), {
      id: "goose-quicknote-save-failed",
      description: storeText("quicknoteRetry"),
      action: {
        label: storeText("retry"),
        onClick: () => {
          useQuickNote.setState((state) => ({ drafts: { ...state.drafts } }));
        },
      },
    });
  },
  removeItem: (name) => localStorageAdapter.removeItem(name),
};
