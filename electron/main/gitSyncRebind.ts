import { t } from "./i18n/gitErrors";
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

export async function preserveReboundHistory(storageRoot: string, repositoryId: string, previous: GitRepositoryFolder, next: GitRepositoryFolder) {
  const file = path.join(storageRoot, repositoryId, "manifest.json");
  let manifest: RebindManifest;
  try { manifest = JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw Object.assign(new Error(t("readRecovery")), { cause: error });
  }
  if (manifest.version !== 1 || !manifest.baseline || typeof manifest.baseline !== "object") throw new Error(t("invalidRecovery"));
  const oldKey = `${previous.notebookId}:${previous.remotePath}`;
  const newKey = `${next.notebookId}:${next.remotePath}`;
  for (const snapshots of oldKey === newKey ? [] : [manifest.baseline, manifest.pending?.before, manifest.pending?.after]) {
    if (!snapshots || !Object.hasOwn(snapshots, oldKey)) continue;
    if (Object.hasOwn(snapshots, newKey) && JSON.stringify(snapshots[newKey]) !== JSON.stringify(snapshots[oldKey])) throw new Error(t("targetRecovery"));
    snapshots[newKey] = snapshots[oldKey]!;
  }
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
  if (!request || typeof request !== "object") throw new Error(t("invalidLink"));
  const id = validateRepositoryId(request.repositoryId);
  const previous = context.configs.get(id);
  const original = previous?.folders.find((folder) => folder.notebookId === request.notebookId);
  if (!previous || !original || !request.folder) throw new Error(t("linkChanged"));
  const updated = validateGitRepository({ ...previous, folders: previous.folders.map((folder) => folder === original ? { ...request.folder, remotePath: original.remotePath } : folder) });
  const replacement = updated.folders.find((folder) => folder.remotePath === original.remotePath)!;
  replacement.localPath = await checkedGitRoot(replacement.localPath);
  await validateGitSyncFolder(replacement.localPath);
  const history = context.mappingHistory[id] ?? previous.folders;
  if (history.some((folder) => folder.notebookId !== original.notebookId && folder.notebookId === replacement.notebookId)) throw new Error(t("targetLinked"));
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
