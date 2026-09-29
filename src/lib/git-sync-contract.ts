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

export interface GitSyncStatus {
  notebookId: string;
  phase: "idle" | "syncing" | "error";
  lastSyncedAt: string | null;
  error: string | null;
}

export interface GitSyncState {
  configs: GitSyncConfig[];
  statuses: GitSyncStatus[];
}

export interface GitSyncBridge {
  getState: () => Promise<GitSyncState>;
  save: (config: GitSyncConfig) => Promise<GitSyncState>;
  remove: (notebookId: string) => Promise<GitSyncState>;
  syncNow: (notebookId: string) => Promise<GitSyncState>;
  onState: (callback: (state: GitSyncState) => void) => () => void;
  onPrepare: (callback: (requestId: string, localPath: string) => void) => () => void;
  replyPrepare: (requestId: string, error: string | null) => void;
  onFinish: (callback: (requestId: string) => void) => () => void;
}

export const DEFAULT_GIT_SYNC_INTERVAL = 5;

export function validateGitSyncConfig(value: GitSyncConfig): GitSyncConfig {
  if (!value || typeof value !== "object") throw new Error("同步配置无效");
  if (typeof value.notebookId !== "string" || !value.notebookId.trim()) throw new Error("请选择记事本");
  if (typeof value.localPath !== "string" || !value.localPath.trim()) throw new Error("记事本没有本地文件夹");
  if (value.provider !== "github" && value.provider !== "gitee") throw new Error("请选择 GitHub 或 Gitee");
  const host = value.provider === "github" ? "github.com" : "gitee.com";
  const remoteUrl = typeof value.remoteUrl === "string" ? value.remoteUrl.trim() : "";
  const escapedHost = host.replace(".", "\\.");
  const repo = "[A-Za-z0-9_-][A-Za-z0-9_.-]*/[A-Za-z0-9_-][A-Za-z0-9_.-]*";
  if (!new RegExp(`^(?:git@${escapedHost}:|ssh://git@${escapedHost}/)${repo}$`).test(remoteUrl)) {
    throw new Error(`仅支持 ${host} 的 SSH 仓库地址，例如 git@${host}:用户名/仓库.git`);
  }
  const branch = typeof value.branch === "string" ? value.branch.trim() : "";
  if (!branch || branch.length > 200 || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) || /\.\.|\/\/|@\{|\.lock(?:\/|$)/.test(branch) || branch.split("/").some((part) => !part || part.startsWith(".") || part.endsWith("."))) {
    throw new Error("分支名称无效");
  }
  if (!Number.isInteger(value.intervalMinutes) || value.intervalMinutes < 1 || value.intervalMinutes > 1440) throw new Error("自动同步间隔须为 1–1440 分钟的整数");
  if (typeof value.enabled !== "boolean") throw new Error("自动同步开关无效");
  return { notebookId: value.notebookId, localPath: value.localPath, provider: value.provider, remoteUrl, branch, intervalMinutes: value.intervalMinutes, enabled: value.enabled };
}
