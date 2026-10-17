import { gitText } from "./git-messages";
import { canonicalLocalPath, canonicalRelativePath, comparisonLocalPath, localPathsAreCaseInsensitive } from "@/lib/canonicalLocalPath";
import { relocateExistsCache } from "@/lib/electron/gooseFsHelpers";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { isGitNotebookDirectory } from "@/lib/git-notebook-directory";
import type { GitSyncState } from "@/lib/git-sync-contract";
import { beginNotebookRescanSuppression, endNotebookRescanSuppression } from "@/lib/local-folder-rescan-guard";
import { relocateLocalMdSnapshots } from "@/lib/local-md-snapshot";
import { rebaseBatchPlanJournals, rebaseNotebookFileReferences, stampNotebookMarker } from "@/lib/notebook-root-paths";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { acquireLocalPageFileOperation, flushPendingLocalSaveByPageIdInternal } from "@/stores/pages/folderSync";
import { markSelfMoved } from "@/stores/pages/actions/localFolder/move";
import type { Notebook } from "@/stores/notebooks/types";

const pathKey = (value: string) => comparisonLocalPath(value, localPathsAreCaseInsensitive()).replace(/\/+$/, "");

export function localFolderNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return gitText("enterName");
  if (!isGitNotebookDirectory(trimmed)) return gitText("invalidName");
  return null;
}

export function planRenamedNotebookPath(localPath: string, name: string): { previous: string; next: string } {
  const previous = canonicalLocalPath(localPath).replace(/\/+$/, "");
  const slash = previous.lastIndexOf("/");
  if (slash <= 0) throw new Error(gitText("cannotRename"));
  return { previous, next: `${previous.slice(0, slash)}/${name.trim()}` };
}

export function assertGitRemoteNameAvailable(state: Pick<GitSyncState, "configs" | "mappingHistory">, notebookId: string, name: string) {
  const next = name.normalize("NFC").toLowerCase();
  for (const config of state.configs) {
    if (config.layout !== "subfolders") continue;
    const current = config.folders.find((folder) => folder.notebookId === notebookId);
    if (!current || current.remotePath.normalize("NFC").toLowerCase() === next) continue;
    const history = state.mappingHistory?.[config.id] ?? [];
    const clash = [...config.folders, ...history].some((folder) => folder.notebookId !== notebookId && folder.remotePath.normalize("NFC").toLowerCase() === next);
    if (clash) throw new Error(gitText("duplicateName"));
  }
}

function assertNoNotebookOverlap(notebookId: string, nextPath: string) {
  const next = pathKey(nextPath);
  for (const notebook of Object.values(useNotebooks.getState().notebooks)) {
    if (notebook.id === notebookId || !notebook.localPath) continue;
    const other = pathKey(notebook.localPath);
    if (other === next || other.startsWith(`${next}/`) || next.startsWith(`${other}/`)) {
      throw new Error(gitText("folderUsed"));
    }
  }
}

function rebasePath(filePath: string, oldRoot: string, newRoot: string): string {
  const relative = canonicalRelativePath(oldRoot, filePath);
  if (relative === null) return filePath;
  const next = newRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  return relative ? `${next}/${relative}` : next;
}

function applyRenamedPaths(notebookId: string, oldRoot: string, newRoot: string, updates: Partial<Notebook>) {
  useNotebooks.getState().updateNotebook(notebookId, { ...updates, localPath: newRoot, localPathMissing: false });
  usePages.setState((state) => {
    let changed = false;
    const pages = { ...state.pages };
    for (const page of Object.values(pages)) {
      if (page.workspaceId !== notebookId || !page.localFilePath) continue;
      const localFilePath = rebasePath(page.localFilePath, oldRoot, newRoot);
      if (localFilePath === page.localFilePath) continue;
      pages[page.id] = { ...page, localFilePath };
      changed = true;
    }
    return changed ? { pages } : state;
  });
  relocateLocalMdSnapshots(oldRoot, newRoot);
  relocateExistsCache(oldRoot, newRoot);
}

export async function commitRenamedNotebookRoot(notebookId: string, oldRoot: string, newRoot: string, updates: Partial<Notebook>) {
  applyRenamedPaths(notebookId, oldRoot, newRoot, updates);
  rebaseBatchPlanJournals(notebookId, oldRoot, newRoot);
  await rebaseNotebookFileReferences(notebookId, oldRoot, newRoot);
  await stampNotebookMarker(notebookId, newRoot);
}

function readableError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error(gitText("renameFailed"));
  return new Error(error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, ""));
}

/** 修改本地笔记本名称时重命名真实文件夹，并改写仍指向旧路径的映射。 */
export async function renameLocalNotebookFolder(
  notebookId: string,
  name: string,
  updates: Partial<Pick<Notebook, "name" | "icon" | "excludeFromGlobalSearch">>,
): Promise<void> {
  const invalid = localFolderNameError(name);
  if (invalid) throw new Error(invalid);
  const notebook = useNotebooks.getState().notebooks[notebookId];
  if (!notebook?.localPath || notebook.source !== "local-folder") throw new Error(gitText("notLocal"));
  const trimmed = name.trim();
  const { previous, next } = planRenamedNotebookPath(notebook.localPath, trimmed);
  if (bareEqual(previous, next)) {
    useNotebooks.getState().updateNotebook(notebookId, { ...updates, name: trimmed });
    return;
  }
  assertNoNotebookOverlap(notebookId, next);
  const desktop = getGooseDesktop();
  if (!desktop?.gitSync?.renameNotebookFolder) throw new Error(gitText("fsUnavailable"));
  assertGitRemoteNameAvailable(await desktop.gitSync.getState(), notebookId, trimmed);
  if (pathKey(previous) !== pathKey(next) && await desktopPathExists(next)) throw new Error(gitText("nameExists"));

  const pages = Object.values(usePages.getState().pages).filter((page) => page.workspaceId === notebookId && page.localFilePath);
  window.dispatchEvent(new CustomEvent("goose-note:flush-editor", { detail: { immediate: true } }));
  for (const page of pages) if (!page.isFolder) await flushPendingLocalSaveByPageIdInternal(page.id, usePages.getState);
  const releases: Array<() => void> = [];
  const suppression = beginNotebookRescanSuppression(notebookId);
  window.gooseFs?.unwatch(notebook.localPath);
  markSelfMoved(previous);
  markSelfMoved(next);
  let storedPath: string | null = null;
  try {
    for (const page of pages) releases.push(await acquireLocalPageFileOperation(page.id));
    const stored = await desktop.gitSync.renameNotebookFolder({
      notebookId,
      previousLocalPath: notebook.localPath,
      localPath: next,
      name: trimmed,
    });
    storedPath = stored.localPath;
    await commitRenamedNotebookRoot(notebookId, notebook.localPath, stored.localPath, { ...updates, name: trimmed });
    window.gooseFs?.watch(stored.localPath, () => {});
    window.setTimeout(() => endNotebookRescanSuppression(notebookId, suppression), 500);
  } catch (error) {
    if (!storedPath) {
      window.gooseFs?.watch(notebook.localPath, () => {});
      endNotebookRescanSuppression(notebookId, suppression);
      throw readableError(error);
    }
    let mappingFailed = false;
    try {
      await commitRenamedNotebookRoot(notebookId, notebook.localPath, storedPath, { ...updates, name: trimmed });
    } catch {
      mappingFailed = true;
    }
    window.gooseFs?.watch(storedPath, () => {});
    window.setTimeout(() => endNotebookRescanSuppression(notebookId, suppression), 500);
    if (mappingFailed) throw readableError(error);
  } finally {
    releases.reverse().forEach((release) => release());
  }
}

function bareEqual(left: string, right: string): boolean {
  return canonicalLocalPath(left).replace(/\/+$/, "") === canonicalLocalPath(right).replace(/\/+$/, "");
}

async function desktopPathExists(path: string): Promise<boolean> {
  if (window.gooseFs?.existsAsync) return window.gooseFs.existsAsync(path);
  return window.gooseFs?.exists(path) ?? false;
}
