import { createTranslator, i18nYaml } from "@/i18n/core";
const storeText = createTranslator(i18nYaml<"src/stores/pages/actions/localFolder/write/persistence.ts#block1:1">`
zh-Hans:
  notSavedDisk: "笔记尚未保存到磁盘"
en:
  notSavedDisk: "The note has not been saved to disk"
ja:
  notSavedDisk: "ノートはまだディスクに保存されていません"
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
import { toast } from "@/components/ui/sonner";
import { describeDiskWriteError } from "@/lib/diskWriteError";

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
  if (syncPath) await waitForGitSyncWrites(syncPath);

  const releaseFileOperation = await acquireLocalPageFileOperation(pageId);
  try {
    return await saveLocalPageContentUnlocked(
      set,
      get,
      gooseFs,
      pageId,
      content,
      options,
    );
  } catch (error) {
    toast.error(storeText("notSavedDisk"), {
      description: describeDiskWriteError(error),
    });
    throw error;
  } finally {
    releaseFileOperation();
  }
};

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
