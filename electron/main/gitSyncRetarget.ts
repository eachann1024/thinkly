import { t } from "./i18n/gitErrors";
import { rename } from "node:fs/promises";
import { canonicalLocalPath, comparisonLocalPath, localPathsAreCaseInsensitive } from "../../src/lib/canonicalLocalPath";
import { isGitNotebookDirectory } from "../../src/lib/git-notebook-directory";
import { validateGitRepository, type GitNotebookFolderRename, type GitRepositoryConfig, type GitRepositoryFolder, type GitSyncState } from "../../src/lib/git-sync-contract";
import { assertAllowed, hasUnsafeSegments, replaceVaultRoot } from "./allowlist";
import { assertGitSyncWritable } from "./gitSyncLock";
import { clearNotebookRenameIntent, writeNotebookRenameIntent, type NotebookRenameIntent } from "./gitSyncRenameIntent";
import type { GitMappingHistory } from "./gitSyncStore";
import { retargetTrashUndoPaths } from "./trashUndo";

const pathKey = (value: string) => comparisonLocalPath(value, localPathsAreCaseInsensitive()).replace(/\/+$/, "");
const bare = (value: string) => canonicalLocalPath(value).replace(/\/+$/, "");

function assertRenameRequest(request: GitNotebookFolderRename): { name: string; previous: string; next: string } {
  if (!request || typeof request !== "object") throw new Error(t("invalidRename"));
  if (typeof request.notebookId !== "string" || !request.notebookId.trim() || request.notebookId.length > 200) throw new Error(t("invalidNotebook"));
  const name = typeof request.name === "string" ? request.name.trim() : "";
  if (!isGitNotebookDirectory(name)) throw new Error(t("invalidName"));
  if (typeof request.previousLocalPath !== "string" || typeof request.localPath !== "string" || hasUnsafeSegments(request.localPath)) {
    throw new Error(t("invalidPath"));
  }
  const previous = assertAllowed(request.previousLocalPath);
  const slash = previous.lastIndexOf("/");
  if (slash <= 0) throw new Error(t("cannotRename"));
  // 新路径只能是原仓库根的同级新名字。渲染进程给出的路径只用来核对名称，
  // 真正落盘的位置以已允许的旧路径为准，避免 /tmp 与 /private/tmp 这种前缀差把改名拒绝掉。
  if (bare(request.localPath).split("/").pop() !== name) throw new Error(t("renameInPlace"));
  return { name, previous, next: `${previous.slice(0, slash)}/${name}` };
}

/** 远端子目录仍按文件夹名对齐；改名前先挡住会撞车的名称，避免下次同步把映射改乱。 */
export function assertGitRemoteNameAvailable(state: Pick<GitSyncState, "configs" | "mappingHistory">, notebookId: string, name: string) {
  const next = name.normalize("NFC").toLowerCase();
  for (const config of state.configs) {
    if (config.layout !== "subfolders") continue;
    const current = config.folders.find((folder) => folder.notebookId === notebookId);
    if (!current || current.remotePath.normalize("NFC").toLowerCase() === next) continue;
    const history = state.mappingHistory?.[config.id] ?? [];
    const clash = [...config.folders, ...history].some((folder) => folder.notebookId !== notebookId && folder.remotePath.normalize("NFC").toLowerCase() === next);
    if (clash) throw new Error(t("duplicateNotebook"));
  }
}

function retargetFolder(folder: GitRepositoryFolder, notebookId: string, localPath: string, name: string): GitRepositoryFolder {
  return folder.notebookId === notebookId ? { ...folder, localPath, name } : folder;
}

function renameError(error: unknown): Error {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ENOENT") return new Error(t("sourceMissing"));
  if (code === "EEXIST" || code === "ENOTEMPTY") return new Error(t("targetExists"));
  if (code === "EACCES" || code === "EPERM") return new Error(t("renamePermission"));
  return new Error(t("renameFailed"));
}

async function moveDirectory(from: string, to: string) {
  try {
    await rename(from, to);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const caseOnly = pathKey(from) === pathKey(to);
    if (!caseOnly || (code !== "EEXIST" && code !== "ENOTEMPTY")) throw renameError(error);
    const temp = `${from.slice(0, from.lastIndexOf("/"))}/.goose-rename-${Date.now()}`;
    try {
      await rename(from, temp);
      await rename(temp, to);
    } catch (second) {
      await rename(temp, from).catch(() => undefined);
      throw renameError(second);
    }
  }
}

export interface NotebookRetargetContext {
  configs: Map<string, GitRepositoryConfig>;
  mappingHistory: GitMappingHistory;
  persist: () => Promise<void>;
  publish: () => void;
  userData: string;
}

function rememberMappings(context: NotebookRetargetContext) {
  return {
    configs: new Map([...context.configs].map(([id, config]) => [id, structuredClone(config)])),
    history: structuredClone(context.mappingHistory),
  };
}

function restoreMappings(context: NotebookRetargetContext, snapshot: ReturnType<typeof rememberMappings>) {
  context.configs.clear();
  for (const [id, config] of snapshot.configs) context.configs.set(id, config);
  for (const id of Object.keys(context.mappingHistory)) delete context.mappingHistory[id];
  Object.assign(context.mappingHistory, snapshot.history);
}

async function retargetMappings(context: NotebookRetargetContext, intent: NotebookRenameIntent) {
  let changed = false;
  for (const [id, config] of context.configs) {
    if (!config.folders.some((folder) => folder.notebookId === intent.notebookId)) continue;
    context.configs.set(id, validateGitRepository({
      ...config,
      folders: config.folders.map((folder) => retargetFolder(folder, intent.notebookId, intent.next, intent.name)),
    }));
    changed = true;
  }
  for (const [id, folders] of Object.entries(context.mappingHistory)) {
    if (!folders.some((folder) => folder.notebookId === intent.notebookId)) continue;
    context.mappingHistory[id] = folders.map((folder) => retargetFolder(folder, intent.notebookId, intent.next, intent.name));
    changed = true;
  }
  replaceVaultRoot(intent.previous, intent.next);
  retargetTrashUndoPaths(intent.previous, intent.next);
  if (changed) await context.persist();
  context.publish();
}

export async function renameGitTrackedNotebookFolder(request: GitNotebookFolderRename, context: NotebookRetargetContext): Promise<{ localPath: string }> {
  const { name, previous, next } = assertRenameRequest(request);
  assertGitRemoteNameAvailable({ configs: [...context.configs.values()], mappingHistory: context.mappingHistory }, request.notebookId, name);
  const unchanged = bare(previous) === bare(next);
  if (unchanged) return { localPath: next };
  const intent = { notebookId: request.notebookId, previous, next, name };
  await writeNotebookRenameIntent(context.userData, intent);
  const snapshot = rememberMappings(context);
  try {
    assertGitSyncWritable(previous);
    assertGitSyncWritable(next);
    await moveDirectory(previous, next);
    await retargetMappings(context, intent);
    await clearNotebookRenameIntent(context.userData);
  } catch (error) {
    restoreMappings(context, snapshot);
    replaceVaultRoot(next, previous);
    try {
      await moveDirectory(next, previous);
      await clearNotebookRenameIntent(context.userData);
    } catch {
      // 目录没能移回去时保留意图，下次启动继续把映射补到实际位置。
    }
    throw error;
  }
  return { localPath: next };
}

export async function finishNotebookRenameIntent(context: NotebookRetargetContext, intent: NotebookRenameIntent): Promise<void> {
  const snapshot = rememberMappings(context);
  try {
    await retargetMappings(context, intent);
    await clearNotebookRenameIntent(context.userData);
  } catch (error) {
    restoreMappings(context, snapshot);
    throw error;
  }
}
