import { createHash } from "node:crypto";
import type { GitRepositoryFolder, GitSyncConflict, GitSyncConflictDetail, GitConflictResolution } from "../../src/lib/git-sync-contract";
export type { GitSyncConflict, GitSyncConflictDetail, GitConflictResolution } from "../../src/lib/git-sync-contract";

interface CachedConflict {
  info: GitSyncConflict;
  local: string | undefined;
  remote: string | undefined;
  choice?: GitConflictResolution["choice"];
}
// Only choices and previews are ephemeral. No original file is changed until the
// normal validated sync transaction pushes and applies its durable journal.
const repositories = new Map<string, Map<string, CachedConflict>>();
export class GitConflictError extends Error {
  readonly conflicts: readonly GitSyncConflict[];
  constructor(conflicts: GitSyncConflict[]) {
    super("同步冲突：请选择每个文件的处理方式，然后继续同步。双方内容已保留。");
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
  // Inspect UTF-8 validity across the complete content; a cut through a multi-byte
  // character must not misclassify an otherwise valid text file as binary.
  const text = bytes.toString("utf8");
  const binary = bytes.includes(0) || !Buffer.from(text, "utf8").equals(bytes);
  return { text: binary ? null : bytes.subarray(0, limit).toString("utf8"), binary, truncated: bytes.length > limit };
}

export async function getGitConflict(repositoryId: string, conflictId: string): Promise<GitSyncConflictDetail> {
  const conflict = repositories.get(repositoryId)?.get(conflictId);
  if (!conflict) throw new Error("冲突已变化或已处理，请重新同步以获取最新内容");
  const local = preview(conflict.local), remote = preview(conflict.remote);
  return { ...conflict.info, localText: local.text, remoteText: remote.text, binary: local.binary || remote.binary, truncated: local.truncated || remote.truncated };
}

export async function resolveGitConflict(request: GitConflictResolution): Promise<void> {
  if (!["local", "remote", "both"].includes(request.choice)) throw new Error("冲突处理方式无效");
  const conflict = repositories.get(request.repositoryId)?.get(request.conflictId);
  if (!conflict) throw new Error("冲突已变化或已处理，请重新同步以获取最新内容");
  if (request.choice === "both" && (conflict.local === undefined || conflict.remote === undefined)) throw new Error("一方已删除文件，无法保留两份；请选择本地或远端版本");
  conflict.choice = request.choice;
}
