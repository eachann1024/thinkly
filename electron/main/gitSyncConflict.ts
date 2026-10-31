import { t } from "./i18n/gitErrors";
import { createHash } from "node:crypto";
import type { GitRepositoryFolder, GitSyncConflict, GitSyncConflictDetail, GitConflictResolution, GitConflictBatchResolution } from "../../src/lib/git-sync-contract";
export type { GitSyncConflict, GitSyncConflictDetail, GitConflictResolution } from "../../src/lib/git-sync-contract";

interface CachedConflict {
  info: GitSyncConflict;
  local: string | undefined;
  remote: string | undefined;
  choice?: GitConflictResolution["choice"];
}
const repositories = new Map<string, Map<string, CachedConflict>>();
export class GitConflictError extends Error {
  readonly conflicts: readonly GitSyncConflict[];
  constructor(conflicts: GitSyncConflict[], message = t("conflict")) {
    super(message);
    this.name = "GitConflictError";
    this.conflicts = conflicts;
  }
}

export function recordGitConflict(repositoryId: string, identity: string, folder: GitRepositoryFolder, name: string, local: string | undefined, remote: string | undefined): CachedConflict {
  const id = createHash("sha256").update(JSON.stringify([identity, folder.notebookId, folder.localPath, folder.remotePath, name, local ?? null, remote ?? null])).digest("hex");
  let cache = repositories.get(repositoryId);
  if (!cache) { cache = new Map(); repositories.set(repositoryId, cache); }
  const existing = cache.get(id);
  if (existing) return existing;
  const conflict: CachedConflict = {
    info: { id, notebookId: folder.notebookId, folderName: folder.name, path: name, localExists: local !== undefined, remoteExists: remote !== undefined }, local, remote,
  };
  cache.set(id, conflict);
  return conflict;
}

export function retainGitConflicts(repositoryId: string, ids: Set<string>) {
  const cache = repositories.get(repositoryId);
  if (cache) for (const id of cache.keys()) if (!ids.has(id)) cache.delete(id);
  if (!cache?.size) repositories.delete(repositoryId);
}

const limit = 256 * 1024;
function preview(value: string | undefined) {
  if (value === undefined) return { text: null, binary: false, truncated: false };
  const bytes = Buffer.from(value, "base64");
  const text = bytes.toString("utf8");
  const binary = bytes.includes(0) || !Buffer.from(text, "utf8").equals(bytes);
  return { text: binary ? null : bytes.subarray(0, limit).toString("utf8"), binary, truncated: bytes.length > limit };
}

export async function getGitConflict(repositoryId: string, conflictId: string): Promise<GitSyncConflictDetail> {
  const conflict = repositories.get(repositoryId)?.get(conflictId);
  if (!conflict) throw new Error(t("conflictChanged"));
  const local = preview(conflict.local), remote = preview(conflict.remote);
  return { ...conflict.info, localText: local.text, remoteText: remote.text, binary: local.binary || remote.binary, truncated: local.truncated || remote.truncated };
}

function checkedResolution(request: GitConflictResolution) {
  if (!["local", "remote", "both"].includes(request.choice)) throw new Error(t("invalidResolution"));
  const conflict = repositories.get(request.repositoryId)?.get(request.conflictId);
  if (!conflict) throw new Error(t("conflictChanged"));
  if (request.choice === "both" && (conflict.local === undefined || conflict.remote === undefined)) throw new Error(t("cannotKeepBoth"));
  return conflict;
}

export async function resolveGitConflict(request: GitConflictResolution): Promise<void> {
  checkedResolution(request).choice = request.choice;
}

export function resolveGitConflicts(request: GitConflictBatchResolution, expected: GitSyncConflict[]) {
  if (!Array.isArray(request.resolutions) || !expected.length || request.resolutions.length !== expected.length
    || new Set(request.resolutions.map(item => item?.conflictId)).size !== expected.length
    || expected.some(conflict => !request.resolutions.some(item => item?.conflictId === conflict.id))) throw new Error(t("conflictChanged"));
  const choices = request.resolutions.map(item => ({ conflict: checkedResolution({ ...item, repositoryId: request.repositoryId }), choice: item.choice }));
  for (const { conflict, choice } of choices) conflict.choice = choice;
}
