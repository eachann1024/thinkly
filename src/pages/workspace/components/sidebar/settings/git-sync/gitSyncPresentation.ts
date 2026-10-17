import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/gitSyncPresentation.ts#localMessages:1">`
zh-Hans:
  syncing_a270: "正在同步…"
  restoringFolder_6233: "正在恢复文件夹…"
  saving_9b80: "正在保存…"
  folderIssueCount: "{{count}} 个文件夹需要处理"
  noFoldersSelectedForSync_2971: "尚未选择同步文件夹"
  contentConflicts_66cf: "有内容冲突"
  syncFailed_d610: "同步失败"
  initialSyncNotComplete_7378: "尚未完成首次同步"
  upToDate_ed28: "同步正常"
  automaticSyncIsOff_e5e2: "自动同步已关闭"
  operationFailedPleaseTryAgain_9155: "操作失败，请重试"
  thisRepositoryBranchAlreadyHasA_08df: "此仓库分支已有同步配置，请选择已有仓库"
  networkConnectionFailedPleaseTryAgain_9bb3: "网络连接失败，请重试"
  sshConnectionFailedCheckYourConnection_9f5b: "SSH 连接失败，请检查连接设置"
  resolveTheFolderIssuesBelowThen_4974: "请处理下方文件夹问题后重试"
en:
  syncing_a270: "Syncing…"
  restoringFolder_6233: "Restoring folder…"
  saving_9b80: "Saving…"
  folderIssueCount: "Folders needing attention: {{count}}"
  noFoldersSelectedForSync_2971: "No folders selected for sync"
  contentConflicts_66cf: "Content conflicts"
  syncFailed_d610: "Sync failed"
  initialSyncNotComplete_7378: "Initial sync not complete"
  upToDate_ed28: "Up to date"
  automaticSyncIsOff_e5e2: "Automatic sync is off"
  operationFailedPleaseTryAgain_9155: "Operation failed. Please try again."
  thisRepositoryBranchAlreadyHasA_08df: "This repository branch already has a sync configuration. Select the existing repository."
  networkConnectionFailedPleaseTryAgain_9bb3: "Network connection failed. Please try again."
  sshConnectionFailedCheckYourConnection_9f5b: "SSH connection failed. Check your connection settings."
  resolveTheFolderIssuesBelowThen_4974: "Resolve the folder issues below, then try again"
`;
const uiText = createTranslator(localMessages);
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
  if (status?.phase === "syncing") return uiText("syncing_a270");
  if (pending && /文件夹/.test(pending)) return uiText("restoringFolder_6233");
  if (pending) return /保存/.test(pending) ? uiText("saving_9b80") : `${pending}…`;
  if (folderError) return uiText("folderIssueCount", { count: folderError });
  if (!folderCount) return uiText("noFoldersSelectedForSync_2971");
  if (status?.conflicts?.length) return uiText("contentConflicts_66cf");
  if (status?.phase === "error") return uiText("syncFailed_d610");
  if (!status?.lastSyncedAt) return uiText("initialSyncNotComplete_7378");
  return enabled ? uiText("upToDate_ed28") : uiText("automaticSyncIsOff_e5e2");
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
  error instanceof Error ? error.message : String(error || uiText("operationFailedPleaseTryAgain_9155"));

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
    throw new Error(uiText("thisRepositoryBranchAlreadyHasA_08df"));
  return valid;
}

export function repositoryLabel(remoteUrl: string) {
  return remoteUrl.replace(/^git@[^:]+:|^ssh:\/\/git@[^/]+\//, "").replace(/\.git$/, "");
}
export function shortSyncError(error: string) {
  if (/网络|连接.*失败|超时|无法连接|DNS/.test(error)) return uiText("networkConnectionFailedPleaseTryAgain_9bb3");
  if (/SSH|公钥|鉴权|认证/.test(error)) return uiText("sshConnectionFailedCheckYourConnection_9f5b");
  if (/文件夹|符号链接|路径|笔记本/.test(error)) return uiText("resolveTheFolderIssuesBelowThen_4974");
  return error.split(/[\n。；]/)[0].slice(0, 70);
}
