import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/write/persistence.ts#block1:1">`
zh-Hans:
  saveFailed: "「{{title}}」未能保存到磁盘"
  retry: "重试"
  saveIncomplete: "本地页面保存未完成：{{id}}"
  pageUnavailable: "笔记已删除或不可用，请先恢复笔记后重试。"
en:
  saveFailed: "“{{title}}” couldn’t be saved to disk"
  retry: "Retry"
  saveIncomplete: "The local page has not finished saving: {{id}}"
  pageUnavailable: "This note was deleted or is unavailable. Restore it before retrying."
ja:
  saveFailed: "「{{title}}」をディスクに保存できませんでした"
  retry: "再試行"
  saveIncomplete: "ローカルページの保存が完了していません：{{id}}"
  pageUnavailable: "ノートが削除されたか利用できません。復元してから再試行してください。"
`);
import { updateSnapshotStat } from "@/lib/local-md-snapshot";
import type { StoreSet, StoreGet } from "../../hydrate";
import type { JSONContent } from "@/types";
import { waitForGitSyncWrites } from "@/lib/git-sync-write-barrier";
import {
  acquireLocalPageFileOperation,
  flushPendingLocalSaveByPageIdInternal,
  flushAllPendingLocalSavesInternal,
} from "../../../folderSync";
import { saveLocalPageContentUnlocked } from "./save";
import { dismissSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { describeDiskWriteError } from "@/lib/diskWriteError";
import { showSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { isRecoveredLocalSaveConfirmationRequired } from "../../../folderSync";
import { getPendingLocalSaveContent } from "../../../folderSync";
import { localSaveFailureNeedsNotice } from "./saveSnapshot";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getRecoveryEntry, acknowledgeRecoveryEntry } from "@/lib/storage/recoveryJournal";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { reassignEditorDraftTarget } from "../../create/recovery";
import { dismissRecoveryDraftNotice } from "@/lib/recoveryDraftNotice";
import { recoverySettingsMatch } from "@/lib/storage/localRecoverySettings";

export async function refreshSnapshotFingerprint(
  filePath: string,
): Promise<void> {
  const fs = window.gooseFs;
  if (!fs?.statAsync) return;
  try {
    const stat = await fs.statAsync(filePath);
    if (stat) updateSnapshotStat(filePath, stat);
  } catch {
  }
}

export const saveLocalPageContentAction = async (
  set: StoreSet,
  get: StoreGet,
  pageId: string,
  content: JSONContent,
  options?: { force?: boolean; createOnly?: boolean },
): Promise<boolean> => {
  if (typeof window === "undefined" || !window.gooseFs) return false;
  const gooseFs = window.gooseFs;
  const syncPath = get().getLocalFilePath(pageId);
  let releaseFileOperation: (() => void) | undefined;
  try {
    if (syncPath) await waitForGitSyncWrites(syncPath);
    releaseFileOperation = await acquireLocalPageFileOperation(pageId);
    const saved = await saveLocalPageContentUnlocked(
      set,
      get,
      gooseFs,
      pageId,
      content,
      options,
    );
    if (
      saved &&
      !get().dirtyLocalPageIds[pageId] &&
      getPendingLocalSaveContent(pageId) === undefined &&
      !isRecoveredLocalSaveConfirmationRequired(pageId)
    ) {
      dismissSaveRecoveryNotice(`goose-local-page-save-failed:${pageId}`);
      dismissSaveRecoveryNotice(`goose-closed-page-save-failed:${pageId}`);
      dismissSaveRecoveryNotice(`goose-recovery-journal-failed:${pageId}`);
      dismissRecoveryDraftNotice(pageId);
    }
    else if (!saved && localSaveFailureNeedsNotice(
      Boolean(get().dirtyLocalPageIds[pageId]),
      getPendingLocalSaveContent(pageId) !== undefined,
      false,
    )) {
      showLocalSaveFailure(set, pageId, get, storeText("saveIncomplete", { id: pageId }));
    }
    return saved;
  } catch (error) {
    showLocalSaveFailure(set, pageId, get, describeDiskWriteError(error));
    throw error;
  } finally {
    releaseFileOperation?.();
  }
};

function showLocalSaveFailure(
  set: StoreSet,
  pageId: string,
  get: StoreGet,
  description: string,
): void {
  const page = get().getPage(pageId);
  showSaveRecoveryNotice({
    id: `goose-local-page-save-failed:${pageId}`,
    title: storeText("saveFailed", { title: page ? getPageTitle(page) : pageId }),
    description,
    retryLabel: storeText("retry"),
    onRetry: async () => {
      const current = get().getPage(pageId);
      if (!current || current.trashedAt) throw new Error(storeText("pageUnavailable"));
      if (isRecoveredLocalSaveConfirmationRequired(pageId)) {
        throw new Error(storeText("saveIncomplete", { id: pageId }));
      }
      const persistCurrentDraft = async () => {
        if (getPendingLocalSaveContent(pageId) !== undefined) {
          await get().flushPendingLocalSaveByPageId(pageId);
        } else if (get().dirtyLocalPageIds[pageId]) {
          const saved = await get().saveDirtyLocalPage(pageId);
          if (!saved) throw new Error(storeText("saveIncomplete", { id: pageId }));
          const latest = get().getPage(pageId);
          const entry = getRecoveryEntry("local-file", pageId);
          if (latest && entry) {
            const entrySignature = getContentSignature(entry.content);
            const latestSignature = getContentSignature(latest.content);
            if (
              get().dirtyLocalPageIds[pageId] ||
              getPendingLocalSaveContent(pageId) !== undefined ||
              !recoverySettingsMatch(latest, entry.settings) ||
              entrySignature === "__goose-note-unserializable-content__" ||
              entrySignature !== latestSignature ||
              !acknowledgeRecoveryEntry("local-file", pageId, entry.revision)
            ) {
              throw new Error(storeText("saveIncomplete", { id: pageId }));
            }
          }
        }
      };
      try {
        await persistCurrentDraft();
      } catch (error) {
        if (isRecoveredLocalSaveConfirmationRequired(pageId)) throw error;
        const failedPage = get().getPage(pageId);
        const fs = window.gooseFs;
        if (!failedPage?.editorDraft || !failedPage.localFilePath || !fs) throw error;
        const targetExists = fs.existsAsync
          ? await fs.existsAsync(failedPage.localFilePath)
          : fs.exists(failedPage.localFilePath);
        if (!targetExists || !await reassignEditorDraftTarget(set, get, pageId)) throw error;
        await persistCurrentDraft();
      }
      if (
        isRecoveredLocalSaveConfirmationRequired(pageId) ||
        get().dirtyLocalPageIds[pageId] ||
        getPendingLocalSaveContent(pageId) !== undefined
      ) {
        throw new Error(storeText("saveIncomplete", { id: pageId }));
      }
      dismissSaveRecoveryNotice(`goose-local-page-save-failed:${pageId}`);
    },
    onRetryFailure: describeDiskWriteError,
  });
}

export const flushPendingLocalSaveByPageIdAction = async (
  _set: StoreSet,
  get: StoreGet,
  pageId: string,
) => {
  await flushPendingLocalSaveByPageIdInternal(pageId, get);
};

export const flushPendingLocalSavesAction = async (
  _set: StoreSet,
  get: StoreGet,
) => {
  await flushAllPendingLocalSavesInternal(get);
};

export const isLocalPageDirtyAction = (
  get: StoreGet,
  pageId: string,
): boolean => {
  return Boolean(get().dirtyLocalPageIds[pageId]);
};
