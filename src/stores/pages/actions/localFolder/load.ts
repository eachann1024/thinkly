import type { StoreSet, StoreGet } from "../hydrate";
import { ensureLocalFolderOrdersLoaded } from "@/stores/localFolderOrder";
import { useSettings } from "@/stores/useSettings";
import { associatedMarkdownPaths } from "@/lib/associated-markdown-paths";
import {
  localFolderLoadTasks,
  latestLocalFolderLoadRequest,
} from "./load/tasks";
import { loadLocalFolderPagesOnce } from "./load/scan";

let localFolderLoadRequestSequence = 0;

export const loadLocalFolderPagesAction = (
  set: StoreSet,
  get: StoreGet,
  notebookId: string,
  basePath: string,
  options?: { showWelcome?: boolean; forceRead?: boolean },
): Promise<void> => {
  if (typeof window === "undefined" || !window.gooseFs) {
    return Promise.resolve();
  }

  ensureLocalFolderOrdersLoaded(notebookId);

  const hiddenFolders = [...useSettings.getState().localFolderHiddenFolders];
  const fingerprint = JSON.stringify({
    basePath,
    hiddenFolders,
    includedFilePaths: associatedMarkdownPaths(notebookId),
    showWelcome: Boolean(options?.showWelcome),
    forceRead: Boolean(options?.forceRead),
  });
  const existing = localFolderLoadTasks.get(notebookId);
  if (existing?.fingerprint === fingerprint) return existing.promise;

  const requestId = ++localFolderLoadRequestSequence;
  latestLocalFolderLoadRequest.set(notebookId, requestId);
  const promise = loadLocalFolderPagesOnce(
    set,
    get,
    notebookId,
    basePath,
    options,
    hiddenFolders,
    requestId,
    fingerprint,
  ).finally(() => {
    const current = localFolderLoadTasks.get(notebookId);
    if (current?.requestId === requestId) {
      localFolderLoadTasks.delete(notebookId);
    }
  });

  localFolderLoadTasks.set(notebookId, {
    fingerprint,
    requestId,
    promise,
  });
  return promise;
};

export { reloadLocalPageFromDiskAction } from "./load/reload";
export {
  removeSingleLocalPageAction,
  addSingleLocalPageAction,
} from "./load/changes";
