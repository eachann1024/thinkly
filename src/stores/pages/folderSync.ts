import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/folderSync.ts#block1:1">`
zh-Hans:
  savingBeforeMove: "页面正在保存，请完成保存后再迁移"
en:
  savingBeforeMove: "The page is being saved. Wait for saving to finish before moving it."
ja:
  savingBeforeMove: "ページを保存中です。保存の完了後に移動してください"
`);
import type { JSONContent } from "@/types";
import type { PagesState } from "./types";
import { LOCAL_SAVE_DEBOUNCE_MS, LOCAL_SAVE_MAX_WAIT_MS } from "./types";
import { acknowledgeRecoveryEntry, moveRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { getLocalSavePageState, transitionLocalSave } from "./folderSyncRegistry";
import { clearLocalSaveTimers, cloneJSONContent, hasLocalSaveWriteChain, localSaveDebounceTimers, localSaveMaxWaitTimers } from "./folderSyncResources";
import { flushPendingLocalSaveByPageIdInternal } from "./folderSyncFlush";

export { acquireLocalPageFileOperation, clearLocalSaveTimers, cloneJSONContent, hasLocalSaveWriteChain } from "./folderSyncResources";
export { getPendingLocalSaveContent, clearPendingLocalSaveContent, isRecoveredLocalSaveConfirmationRequired } from "./folderSyncRegistry";
export { flushPendingLocalSaveByPageIdInternal, flushAllPendingLocalSavesInternal } from "./folderSyncFlush";

function acknowledgePendingRevision(pageId: string) {
  const recovery = getLocalSavePageState(pageId).recovery;
  if (recovery.status === "awaiting-ack" && acknowledgeRecoveryEntry("local-file", pageId, recovery.revision)) {
    transitionLocalSave(pageId, { type: "acknowledged", revision: recovery.revision });
  }
}
/** Explicit disk acceptance invalidates any old in-flight failure snapshot. */
export const discardPendingLocalSave = (pageId: string) => {
  clearLocalSaveTimers(pageId);
  transitionLocalSave(pageId, { type: "discard" });
  acknowledgePendingRevision(pageId);
};
/** Recovered content remains in memory until the user confirms or edits it. */
export const restorePendingLocalSave = (pageId: string, content: JSONContent, recoveryRevision: number): void => {
  transitionLocalSave(pageId, { type: "restore", content: cloneJSONContent(content), revision: recoveryRevision });
};
export const confirmRecoveredLocalSave = (pageId: string): void => {
  if (getLocalSavePageState(pageId).permission.status !== "confirmation-required") return;
  transitionLocalSave(pageId, { type: "confirm" });
  acknowledgePendingRevision(pageId);
};

function scheduleLocalSave(pageId: string, getState: () => PagesState) {
  const runScheduledFlush = () => {
    void flushPendingLocalSaveByPageIdInternal(pageId, getState).catch(error => {
      console.error("[local-folder] scheduled save failed", pageId, error);
    });
  };
  const existing = localSaveDebounceTimers.get(pageId);
  if (existing) clearTimeout(existing);
  localSaveDebounceTimers.set(pageId, setTimeout(runScheduledFlush, LOCAL_SAVE_DEBOUNCE_MS));
  if (!localSaveMaxWaitTimers.has(pageId)) localSaveMaxWaitTimers.set(pageId, setTimeout(runScheduledFlush, LOCAL_SAVE_MAX_WAIT_MS));
}
export const queueLocalPageSave = (pageId: string, content: JSONContent, getState: () => PagesState, recoveryRevision?: number) => {
  transitionLocalSave(pageId, { type: "queue", content, revision: recoveryRevision });
  scheduleLocalSave(pageId, getState);
};

/** Move the journal before moving the single in-memory page state. */
export const migratePendingLocalSave = (
  oldPageId: string, newPageId: string, getState: () => PagesState,
): { ok: true } | { ok: false; error: string } => {
  if (oldPageId === newPageId) return { ok: true };
  // A running write has captured its page ID. Its owner must flush before moving identity.
  if (hasLocalSaveWriteChain(oldPageId) || hasLocalSaveWriteChain(newPageId)) return { ok: false, error: storeText("savingBeforeMove") };
  const previous = getLocalSavePageState(oldPageId);
  if (previous.pending.status === "empty" && previous.permission.status === "automatic" && previous.recovery.status === "none") return { ok: true };
  const moved = moveRecoveryEntry("local-file", oldPageId, newPageId);
  if (!moved.ok) return moved;
  clearLocalSaveTimers(oldPageId);
  const revision = moved.entry?.revision ?? (previous.recovery.status === "awaiting-ack" ? previous.recovery.revision : null);
  transitionLocalSave(newPageId, { type: "migrate-in", pending: previous.pending, permission: previous.permission, revision });
  transitionLocalSave(oldPageId, { type: "migrate-out" });
  if (previous.pending.status === "queued" && previous.permission.status === "automatic") scheduleLocalSave(newPageId, getState);
  return { ok: true };
};
