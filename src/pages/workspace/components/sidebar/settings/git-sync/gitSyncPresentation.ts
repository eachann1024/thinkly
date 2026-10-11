import { DEFAULT_GIT_SYNC_INTERVAL, validateGitRepository, normalizedGitRemote } from "@/lib/git-sync-contract";
import type { GitDraft } from "./GitRepositoryForm";
import type {
  GitSyncStatus,
  GitRepositoryFolder,
  GitRepositoryInput,
  GitRepositoryConfig,
} from "@/lib/git-sync-contract";

export function gitSyncSummary(
  status: GitSyncStatus | undefined,
  pending: string | undefined,
  folderError: boolean,
  folderCount: number,
  enabled: boolean,
) {
  if (status?.phase === "syncing") return "正在同步所选文件夹…";
  if (pending) return `${pending}…`;
  if (folderError) return "同步受阻 · 已选文件夹需要处理";
  if (!folderCount) return "尚未选择同步文件夹";
  if (status?.conflicts?.length) return "同步受阻 · 有文件冲突需要处理";
  if (status?.phase === "error") return "同步失败 · 需要处理";
  if (!status?.lastSyncedAt) return "尚未完成首次同步";
  return enabled ? "同步正常 · 后台自动同步" : "自动同步已暂停";
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
        return !notebook.localPathMissing && (!mapping || mapping.localPath === notebook.localPath);
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
