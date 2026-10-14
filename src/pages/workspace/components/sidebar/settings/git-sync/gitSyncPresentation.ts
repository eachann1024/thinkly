import { DEFAULT_GIT_SYNC_INTERVAL, validateGitRepository, normalizedGitRemote } from "@/lib/git-sync-contract";
import type { GitDraft } from "./GitRepositoryForm";
import { folderPathKey } from "./gitFolderRows";
import type {
  GitSyncStatus,
  GitRepositoryFolder,
  GitRepositoryInput,
  GitRepositoryConfig,
} from "@/lib/git-sync-contract";

export function gitSyncSummary(
  status: GitSyncStatus | undefined,
  pending: string | undefined,
  folderError: number,
  folderCount: number,
  enabled: boolean,
) {
  if (status?.phase === "syncing") return "正在同步…";
  if (pending && /文件夹/.test(pending)) return "正在恢复文件夹…";
  if (pending) return /保存/.test(pending) ? "正在保存…" : `${pending}…`;
  if (folderError) return `${folderError} 个文件夹需要处理`;
  if (!folderCount) return "尚未选择同步文件夹";
  if (status?.conflicts?.length) return "有内容冲突";
  if (status?.phase === "error") return "同步失败";
  if (!status?.lastSyncedAt) return "尚未完成首次同步";
  return enabled ? "同步正常" : "自动同步已关闭";
}

export function newRemotePath(name: string) {
  const slug =
    name
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^[^A-Za-z0-9]+|[-_]+$/g, "")
      .slice(0, 50) || "notebook";
  return `${slug}-${crypto.randomUUID()}`;
}

export function availableFolderIds(
  notebooks: { id: string; localPath?: string; localPathMissing?: boolean }[],
  folders: GitRepositoryFolder[],
) {
  return new Set(
    notebooks
      .filter((notebook) => {
        const mapping = folders.find((folder) => folder.notebookId === notebook.id);
        return !notebook.localPathMissing && (!mapping || (notebook.localPath && folderPathKey(mapping.localPath) === folderPathKey(notebook.localPath)));
      })
      .map((notebook) => notebook.id),
  );
}

export const emptyDraft = (): GitDraft => ({
  provider: "github",
  remoteUrl: "",
  branch: "main",
  intervalMinutes: DEFAULT_GIT_SYNC_INTERVAL,
  enabled: true,
});
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error || "操作失败，请重试");

export function validateRepositoryInput(input: GitRepositoryInput, configs: GitRepositoryConfig[]) {
  const valid = validateGitRepository(input);
  if (
    configs.some(
      (other) =>
        other.id !== valid.id &&
        normalizedGitRemote(other) === normalizedGitRemote(valid) &&
        other.branch === valid.branch,
    )
  )
    throw new Error("此仓库分支已有同步配置，请选择已有仓库");
  return valid;
}

export function repositoryLabel(remoteUrl: string) {
  return remoteUrl.replace(/^git@[^:]+:|^ssh:\/\/git@[^/]+\//, "").replace(/\.git$/, "");
}
export function shortSyncError(error: string) {
  if (/网络|连接.*失败|超时|无法连接|DNS/.test(error)) return "网络连接失败，请重试";
  if (/SSH|公钥|鉴权|认证/.test(error)) return "SSH 连接失败，请检查连接设置";
  if (/文件夹|符号链接|路径|笔记本/.test(error)) return "请处理下方文件夹问题后重试";
  return error.split(/[\n。；]/)[0].slice(0, 70);
}
