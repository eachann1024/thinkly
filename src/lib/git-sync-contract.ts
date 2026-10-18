import { gitText } from "./git-messages";
import { isGitNotebookDirectory } from "./git-notebook-directory";
export type GitSyncProvider = "github" | "gitee";

export interface GitSyncConfig {
  notebookId: string;
  localPath: string;
  provider: GitSyncProvider;
  remoteUrl: string;
  branch: string;
  intervalMinutes: number;
  enabled: boolean;
}

export type GitSyncStatus = { repositoryId: string; lastSyncedAt: string | null } & (
  | { phase: "idle"; error: null; conflicts?: never }
  | { phase: "syncing"; error: null; conflicts?: GitSyncConflict[] }
  | { phase: "error"; error: string; conflicts?: GitSyncConflict[] }
);

export interface GitSyncConflict {
  id: string;
  notebookId: string;
  folderName: string;
  path: string;
  localExists: boolean;
  remoteExists: boolean;
}

export interface GitSyncConflictDetail extends GitSyncConflict {
  localText: string | null;
  remoteText: string | null;
  binary: boolean;
  truncated: boolean;
}

export interface GitConflictResolution {
  repositoryId: string;
  conflictId: string;
  choice: "local" | "remote" | "both";
}

export interface GitFolderRebind {
  repositoryId: string;
  notebookId: string;
  folder: GitRepositoryFolder;
}

export interface GitNotebookFolderRename {
  notebookId: string;
  previousLocalPath: string;
  localPath: string;
  name: string;
}

export interface GitNotebookFolderAdopt {
  notebookId: string;
  previousLocalPath: string;
  occupiedPaths: string[];
}

export interface GitFolderCheck {
  error: string | null;
  path?: string;
}

export interface GitRepositoryFolder {
  notebookId: string;
  localPath: string;
  name: string;
  remotePath: string;
}

export interface GitRepositoryConfig {
  id: string;
  provider: GitSyncProvider;
  remoteUrl: string;
  branch: string;
  intervalMinutes: number;
  enabled: boolean;
  layout: "subfolders" | "legacy-root";
  folders: GitRepositoryFolder[];
}

export type GitRepositoryInput = GitRepositoryConfig;

export interface GitSyncState {
  configs: GitRepositoryConfig[];
  statuses: GitSyncStatus[];
  mappingHistory?: Record<string, GitRepositoryFolder[]>;
  /** 大模块开关。旧配置缺省时由主进程按是否已有仓库补上。 */
  moduleEnabled: boolean;
}

export interface GitSyncBridge {
  gitAvailable: () => Promise<boolean>;
  setModuleEnabled: (enabled: boolean) => Promise<GitSyncState>;
  getState: () => Promise<GitSyncState>;
  checkFolder: (localPath: string) => Promise<GitFolderCheck>;
  rememberNotebookRoot: (localPath: string) => Promise<boolean>;
  save: (config: GitRepositoryInput) => Promise<GitSyncState>;
  remove: (repositoryId: string) => Promise<GitSyncState>;
  syncNow: (repositoryId: string) => Promise<GitSyncState>;
  rebindFolder: (request: GitFolderRebind) => Promise<GitSyncState>;
  renameNotebookFolder: (request: GitNotebookFolderRename) => Promise<{ localPath: string }>;
  adoptRenamedNotebookFolder: (request: GitNotebookFolderAdopt) => Promise<{ localPath: string; name: string } | null>;
  getConflict: (repositoryId: string, conflictId: string) => Promise<GitSyncConflictDetail>;
  resolveConflict: (request: GitConflictResolution) => Promise<GitSyncState>;
  onState: (callback: (state: GitSyncState) => void) => () => void;
  onPrepare: (callback: (requestId: string, localPaths: string[]) => void) => () => void;
  replyPrepare: (requestId: string, error: string | null) => void;
  onFinish: (callback: (requestId: string) => void) => () => void;
}

export const DEFAULT_GIT_SYNC_INTERVAL = 5;

export function validateGitSyncConfig(value: GitSyncConfig): GitSyncConfig {
  if (!value || typeof value !== "object") throw new Error(gitText("invalidSync"));
  if (typeof value.notebookId !== "string" || !value.notebookId.trim()) throw new Error(gitText("selectNotebook"));
  if (typeof value.localPath !== "string" || !value.localPath.trim()) throw new Error(gitText("noLocalFolder"));
  if (value.provider !== "github" && value.provider !== "gitee") throw new Error(gitText("selectProvider"));
  const host = value.provider === "github" ? "github.com" : "gitee.com";
  const remoteUrl = typeof value.remoteUrl === "string" ? value.remoteUrl.trim() : "";
  const escapedHost = host.replace(".", "\\.");
  const repo = "[A-Za-z0-9_-][A-Za-z0-9_.-]*/[A-Za-z0-9_-][A-Za-z0-9_.-]*";
  if (!new RegExp(`^(?:git@${escapedHost}:|ssh://git@${escapedHost}/)${repo}$`).test(remoteUrl)) {
    throw new Error(gitText("sshExample", { host }));
  }
  const branch = typeof value.branch === "string" ? value.branch.trim() : "";
  if (!branch || branch.length > 200 || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || /\.\.|\/\/|@\{|\.lock(?:\/|$)/.test(branch) || branch.split("/").some((part) => !part || part.startsWith(".") || part.endsWith("."))) {
    throw new Error(gitText("invalidBranch"));
  }
  if (!Number.isInteger(value.intervalMinutes) || value.intervalMinutes < 1 || value.intervalMinutes > 1440) throw new Error(gitText("invalidInterval"));
  if (typeof value.enabled !== "boolean") throw new Error(gitText("invalidEnabled"));
  return { notebookId: value.notebookId, localPath: value.localPath, provider: value.provider, remoteUrl, branch, intervalMinutes: value.intervalMinutes, enabled: value.enabled };
}

export function normalizedGitRemote(config: Pick<GitRepositoryInput, "provider" | "remoteUrl">): string {
  const host = config.provider === "github" ? "github.com" : "gitee.com";
  const repository = config.remoteUrl.replace(/^git@[^:]+:|^ssh:\/\/git@[^/]+\//, "").replace(/\.git$/, "");
  return `git@${host}:${repository.toLowerCase()}.git`;
}

export function validateRepositoryId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value) || Object.prototype.hasOwnProperty.call(Object.prototype, value)) throw new Error(gitText("invalidId"));
  return value;
}

export function validateGitRepository(value: GitRepositoryInput): GitRepositoryInput {
  if (!value || typeof value !== "object") throw new Error(gitText("invalidSync"));
  const id = validateRepositoryId(value.id);
  const shared = validateGitSyncConfig({ ...value, notebookId: id, localPath: "/validation" });
  if (value.layout !== "subfolders" && value.layout !== "legacy-root") throw new Error(gitText("invalidLayout"));
  if (!Array.isArray(value.folders) || value.folders.length > 100 || (value.layout === "legacy-root" && value.folders.length > 1)) throw new Error(gitText("legacyOneFolder"));
  const folders = value.folders.map((folder) => {
    if (!folder || typeof folder.notebookId !== "string" || !folder.notebookId.trim() || folder.notebookId.length > 200) throw new Error(gitText("invalidNotebook"));
    if (typeof folder.name !== "string" || !folder.name.trim() || folder.name.length > 200) throw new Error(gitText("invalidFolderName"));
    if (typeof folder.localPath !== "string" || !/^(?:\/|[A-Za-z]:[\\/])/.test(folder.localPath) || /[\0\r\n]/.test(folder.localPath) || folder.localPath.split(/[\\/]/).includes("..")) throw new Error(gitText("invalidLocalPath"));
    if (typeof folder.remotePath !== "string" || (value.layout === "legacy-root" ? folder.remotePath !== "" : !isGitNotebookDirectory(folder.remotePath))) throw new Error(gitText("invalidRemotePath"));
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(folder.remotePath)) throw new Error(gitText("reservedRemoteName"));
    return { notebookId: folder.notebookId, name: folder.name.trim(), localPath: folder.localPath, remotePath: folder.remotePath };
  });
  for (let i = 0; i < folders.length; i++) for (let j = 0; j < i; j++) {
    const a = folders[i]!, b = folders[j]!;
    const local = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    const x = local(a.localPath), y = local(b.localPath);
    if (a.notebookId === b.notebookId || a.remotePath.normalize("NFC").toLowerCase() === b.remotePath.normalize("NFC").toLowerCase() || x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)) throw new Error(gitText("overlappingMappings"));
  }
  return { id, provider: shared.provider, remoteUrl: shared.remoteUrl, branch: shared.branch, intervalMinutes: shared.intervalMinutes, enabled: shared.enabled, layout: value.layout, folders };
}
