import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateGitRepository, validateRepositoryId, type GitFolderRebind, type GitRepositoryConfig, type GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { durableAtomicWrite } from "./gitSyncDisk";
import { checkedGitRoot } from "./gitSyncFolders";
import { validateGitSyncFolder } from "./gitRepositoryEngine";
import type { GitMappingHistory } from "./gitSyncStore";

type Snapshots = Record<string, Record<string, string>>;
interface RebindManifest {
  version: number;
  identity: string;
  baseline: Snapshots;
  reboundKeys?: string[];
  pending?: { commit: string; before: Snapshots; after: Snapshots };
}

/** Keep the old entries too: a crash before configuration persistence can still
 * recover the original mapping. The new mapping inherits the exact same baseline. */
export async function preserveReboundHistory(storageRoot: string, repositoryId: string, previous: GitRepositoryFolder, next: GitRepositoryFolder) {
  const file = path.join(storageRoot, repositoryId, "manifest.json");
  let manifest: RebindManifest;
  try { manifest = JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw Object.assign(new Error("无法读取同步恢复记录，未修改原关联"), { cause: error });
  }
  if (manifest.version !== 1 || !manifest.baseline || typeof manifest.baseline !== "object") throw new Error("同步恢复记录无效，未修改原关联");
  const oldKey = `${previous.notebookId}:${previous.remotePath}`;
  const newKey = `${next.notebookId}:${next.remotePath}`;
  for (const snapshots of oldKey === newKey ? [] : [manifest.baseline, manifest.pending?.before, manifest.pending?.after]) {
    if (!snapshots || !Object.hasOwn(snapshots, oldKey)) continue;
    if (Object.hasOwn(snapshots, newKey) && JSON.stringify(snapshots[newKey]) !== JSON.stringify(snapshots[oldKey])) throw new Error("目标笔记本已有同步恢复记录，请选择其他文件夹或先解除原关联");
    snapshots[newKey] = snapshots[oldKey]!;
  }
  // A chosen directory is explicit, but its identity is not proven. Treat it as
  // first attachment once, so absent local files cannot delete remote content.
  manifest.reboundKeys = [...new Set([...(manifest.reboundKeys ?? []), newKey])];
  await durableAtomicWrite(file, JSON.stringify(manifest));
}

interface RebindContext {
  configs: Map<string, GitRepositoryConfig>;
  mappingHistory: GitMappingHistory;
  storageRoot: string;
  persist: () => Promise<void>;
  publish: () => void;
}

export async function rebindGitFolder(request: GitFolderRebind, context: RebindContext): Promise<string> {
  if (!request || typeof request !== "object") throw new Error("文件夹关联参数无效");
  const id = validateRepositoryId(request.repositoryId);
  const previous = context.configs.get(id);
  const original = previous?.folders.find((folder) => folder.notebookId === request.notebookId);
  if (!previous || !original || !request.folder) throw new Error("原同步关联已变化，请重新读取配置");
  const updated = validateGitRepository({ ...previous, folders: previous.folders.map((folder) => folder === original ? { ...request.folder, remotePath: original.remotePath } : folder) });
  const replacement = updated.folders.find((folder) => folder.remotePath === original.remotePath)!;
  replacement.localPath = await checkedGitRoot(replacement.localPath);
  await validateGitSyncFolder(replacement.localPath);
  const history = context.mappingHistory[id] ?? previous.folders;
  if (history.some((folder) => folder.notebookId !== original.notebookId && folder.notebookId === replacement.notebookId)) throw new Error("目标笔记本已有其他同步关联，请先解除原关联");
  await preserveReboundHistory(context.storageRoot, id, original, replacement);
  context.configs.set(id, updated);
  context.mappingHistory[id] = [...history.filter((folder) => folder.notebookId !== original.notebookId), replacement];
  try { await context.persist(); }
  catch (error) {
    context.configs.set(id, previous);
    context.mappingHistory[id] = history;
    throw error;
  }
  context.publish();
  return id;
}
