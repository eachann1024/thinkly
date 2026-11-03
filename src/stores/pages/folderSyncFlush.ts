import { createTranslator as extraTranslator, i18nYaml } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/pages/folderSyncFlush.ts#block1:1">`
zh-Hans:
  saveIncomplete: "本地页面保存未完成：{{id}}"
  recoveryIncomplete: "本地页面恢复日志确认未完成：{{id}}"
en:
  saveIncomplete: "The local page has not finished saving: {{id}}"
  recoveryIncomplete: "The local page’s recovery log has not been acknowledged: {{id}}"
ja:
  saveIncomplete: "ローカルページの保存が完了していません：{{id}}"
  recoveryIncomplete: "ローカルページの復元ログの確認が完了していません：{{id}}"
`);
import type { PagesState } from "./types";
import { acknowledgeRecoveryEntry, getRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { getLocalRecoveryContentSignature } from "@/lib/storage/localRecoverySignature";
import { recoverySettingsMatch } from "@/lib/storage/localRecoverySettings";
import { getLocalSavePageState, localSavePageIds, transitionLocalSave } from "./folderSyncRegistry";
import { clearLocalSaveTimers, cloneJSONContent, localSaveDebounceTimers, localSaveMaxWaitTimers, localSaveWriteChains } from "./folderSyncResources";

let nextAttemptId = 0;
export const flushPendingLocalSaveByPageIdInternal = (pageId: string, getState: () => PagesState) => {
  clearLocalSaveTimers(pageId);
  const chain = localSaveWriteChains.get(pageId) ?? Promise.resolve();
  const next = chain.catch(() => {}).then(async () => {
    const restored = getLocalSavePageState(pageId);
    if (restored.permission.status === "confirmation-required") {
      const entry = getRecoveryEntry("local-file", pageId);
      const page = getState().pages[pageId];
      const signature = page && getLocalRecoveryContentSignature(page.content);
      if (!entry || !page || signature == null || signature !== getLocalRecoveryContentSignature(entry.content) ||
          !recoverySettingsMatch(page, entry.settings)) {
        throw new Error(extraText("recoveryIncomplete", { id: pageId }));
      }
      // 兼容旧会话留下的恢复队列，继续普通保存，仍执行磁盘冲突校验。
      transitionLocalSave(pageId, { type: "queue", content: cloneJSONContent(page.content), revision: entry.revision });
    }
    while (getLocalSavePageState(pageId).pending.status === "queued") {
      const attemptId = ++nextAttemptId;
      const started = transitionLocalSave(pageId, { type: "write-started", attemptId });
      if (started.write.status !== "writing" || started.write.attempt.id !== attemptId) break;
      const attempt = started.write.attempt;
      try {
        const saved = await getState().saveLocalPageContent(pageId, cloneJSONContent(attempt.content));
        if (!saved) throw new Error(extraText("saveIncomplete", { id: pageId }));
        const entry = getRecoveryEntry("local-file", pageId);
        const page = getState().pages[pageId];
        const signature = getLocalRecoveryContentSignature(attempt.content);
        const acknowledged = attempt.revision !== null && entry?.revision === attempt.revision &&
          page && !page.editorDraft && page.localFilePath && !getState().dirtyLocalPageIds[pageId] && signature !== null &&
          signature === getLocalRecoveryContentSignature(entry.content) && recoverySettingsMatch(page, entry.settings) &&
          acknowledgeRecoveryEntry("local-file", pageId, attempt.revision);
        transitionLocalSave(pageId, { type: "write-succeeded", attemptId, acknowledgedRevision: acknowledged ? attempt.revision : null });
      } catch (error) {
        transitionLocalSave(pageId, { type: "write-failed", attemptId });
        throw error;
      }
    }
    const current = getLocalSavePageState(pageId);
    if (current.permission.status === "confirmation-required" || current.pending.status !== "empty" || current.recovery.status === "none") return;
    if (getState().dirtyLocalPageIds[pageId]) return;
    const revision = current.recovery.revision;
    const entry = getRecoveryEntry("local-file", pageId);
    const page = getState().pages[pageId];
    const signature = page && getLocalRecoveryContentSignature(page.content);
    if (entry && (entry.revision !== revision || !page || page.editorDraft || !page.localFilePath || signature == null ||
        signature !== getLocalRecoveryContentSignature(entry.content) || !recoverySettingsMatch(page, entry.settings) ||
        !acknowledgeRecoveryEntry("local-file", pageId, revision))) {
      throw new Error(extraText("recoveryIncomplete", { id: pageId }));
    }
    transitionLocalSave(pageId, { type: "acknowledged", revision });
  });
  const finalized = next.finally(() => {
    if (localSaveWriteChains.get(pageId) === finalized) localSaveWriteChains.delete(pageId);
  });
  localSaveWriteChains.set(pageId, finalized);
  return finalized;
};
export const flushAllPendingLocalSavesInternal = async (getState: () => PagesState) => {
  const pageIds = new Set([
    ...localSavePageIds(), ...localSaveDebounceTimers.keys(),
    ...localSaveMaxWaitTimers.keys(), ...localSaveWriteChains.keys(),
  ]);
  await Promise.all([...pageIds].map(pageId => flushPendingLocalSaveByPageIdInternal(pageId, getState)));
};
