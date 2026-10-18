import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/gitSyncPresentation.ts#localMessages:1">`
zh-Hans:
  syncing_a270: "正在同步…"
  restoringFolder_6233: "正在恢复文件夹…"
  saving_9b80: "正在保存…"
  folderIssueCount: "{{count}} 个文件夹需要处理"
  noFoldersSelectedForSync_2971: "尚未选择同步文件夹"
  contentConflicts_66cf: "有内容冲突"
  initialSyncNotComplete_7378: "尚未完成首次同步"
  upToDate_ed28: "同步正常"
  automaticSyncIsOff_e5e2: "自动同步已关闭"
  operationFailedPleaseTryAgain_9155: "操作失败，请重试"
  thisRepositoryBranchAlreadyHasA_08df: "此仓库分支已有同步配置，请选择已有仓库"
  networkConnectionFailedPleaseTryAgain_9bb3: "网络连接失败，请重试"
  sshConnectionFailedCheckYourConnection_9f5b: "SSH 连接失败，请检查连接设置"
  containsSymbolicLinksCannotSync_a3fb: "包含符号链接，无法同步"
  theOriginalFolderNoLongerExists_9875: "原文件夹已不存在"
  theNotebookIsNotOpenOr_a185: "笔记本未打开或无法匹配"
  cannotReadFolderCheckItsPermissions_7101: "无法读取文件夹，请检查权限"
  theOriginalNotebookIsNotOpen_5ea0: "原笔记本未打开或无法匹配"
  folderIssue: "{{name}}：{{reason}}"
en:
  syncing_a270: "Syncing…"
  restoringFolder_6233: "Restoring folder…"
  saving_9b80: "Saving…"
  folderIssueCount: "Folders needing attention: {{count}}"
  noFoldersSelectedForSync_2971: "No folders selected for sync"
  contentConflicts_66cf: "Content conflicts"
  initialSyncNotComplete_7378: "Initial sync not complete"
  upToDate_ed28: "Up to date"
  automaticSyncIsOff_e5e2: "Automatic sync is off"
  operationFailedPleaseTryAgain_9155: "Operation failed. Please try again."
  thisRepositoryBranchAlreadyHasA_08df: "This repository branch already has a sync configuration. Select the existing repository."
  networkConnectionFailedPleaseTryAgain_9bb3: "Network connection failed. Please try again."
  sshConnectionFailedCheckYourConnection_9f5b: "SSH connection failed. Check your connection settings."
  containsSymbolicLinksCannotSync_a3fb: "Contains symbolic links; cannot sync"
  theOriginalFolderNoLongerExists_9875: "The original folder no longer exists"
  theNotebookIsNotOpenOr_a185: "The notebook is not open or could not be matched"
  cannotReadFolderCheckItsPermissions_7101: "Cannot read folder. Check its permissions."
  theOriginalNotebookIsNotOpen_5ea0: "The original notebook is not open or could not be matched"
  folderIssue: "{{name}}: {{reason}}"
ja:
  syncing_a270: "同期中…"
  restoringFolder_6233: "フォルダを復元中…"
  saving_9b80: "保存中…"
  folderIssueCount: "対応が必要なフォルダ：{{count}} 件"
  noFoldersSelectedForSync_2971: "同期するフォルダが選択されていません"
  contentConflicts_66cf: "内容の競合があります"
  initialSyncNotComplete_7378: "初回同期が完了していません"
  upToDate_ed28: "最新の状態です"
  automaticSyncIsOff_e5e2: "自動同期はオフです"
  operationFailedPleaseTryAgain_9155: "操作に失敗しました。もう一度お試しください。"
  thisRepositoryBranchAlreadyHasA_08df: "このリポジトリのブランチには既に同期設定があります。既存のリポジトリを選択してください"
  networkConnectionFailedPleaseTryAgain_9bb3: "ネットワーク接続に失敗しました。もう一度お試しください"
  sshConnectionFailedCheckYourConnection_9f5b: "SSH 接続に失敗しました。接続設定を確認してください"
  containsSymbolicLinksCannotSync_a3fb: "シンボリックリンクが含まれているため同期できません"
  theOriginalFolderNoLongerExists_9875: "元のフォルダが存在しません"
  theNotebookIsNotOpenOr_a185: "ノートブックが開かれていないか、照合できません"
  cannotReadFolderCheckItsPermissions_7101: "フォルダを読み込めません。権限を確認してください"
  theOriginalNotebookIsNotOpen_5ea0: "元のノートブックが開かれていないか、照合できません"
  folderIssue: "{{name}}：{{reason}}"
`;
const uiText = createTranslator(localMessages);
import { gitSyncActionLabel, type GitSyncAction } from "./gitSyncUiState";
import { DEFAULT_GIT_SYNC_INTERVAL, validateGitRepository, normalizedGitRemote } from "@/lib/git-sync-contract";
import type { GitDraft } from "./GitRepositoryForm";
import { folderPathKey } from "./gitFolderRows";
import type {
  GitSyncStatus,
  GitRepositoryFolder,
  GitRepositoryInput,
  GitRepositoryConfig,
} from "@/lib/git-sync-contract";

export function shortFolderReason(error: string) {
  if (/符号链接|symbolic link|symlink/i.test(error)) return uiText("containsSymbolicLinksCannotSync_a3fb");
  if (/不存在|no longer exists|does not exist|not found|missing/i.test(error)) return uiText("theOriginalFolderNoLongerExists_9875");
  if (/未打开|无法匹配|身份|路径已变化|not open|not.*match|identity|path.*changed/i.test(error))
    return uiText("theNotebookIsNotOpenOr_a185");
  if (/权限|permission/i.test(error)) return uiText("cannotReadFolderCheckItsPermissions_7101");
  return error.split(/[\n，。；]/)[0].slice(0, 80);
}

export function formatFolderIssue(name: string, reason: string) {
  return uiText("folderIssue", { name, reason: shortFolderReason(reason) });
}

export function notebookUnavailableReason() {
  return uiText("theOriginalNotebookIsNotOpen_5ea0");
}

export function gitSyncSummary(
  status: GitSyncStatus | undefined,
  pending: GitSyncAction | undefined,
  folderIssues: { name: string; reason: string }[],
  folderCount: number,
  enabled: boolean,
) {
  if (status?.phase === "syncing") return uiText("syncing_a270");
  if (pending === "restore") return uiText("restoringFolder_6233");
  if (pending) return pending === "save-selection" || pending === "save-settings" ? uiText("saving_9b80") : `${gitSyncActionLabel(pending)}…`;
  if (folderIssues.length === 1) return formatFolderIssue(folderIssues[0].name, folderIssues[0].reason);
  if (folderIssues.length) return uiText("folderIssueCount", { count: folderIssues.length });
  if (!folderCount) return uiText("noFoldersSelectedForSync_2971");
  if (status?.conflicts?.length) return uiText("contentConflicts_66cf");
  if (status?.phase === "error") return shortSyncError(status.error);
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
  if (/网络|连接.*失败|超时|无法连接|network|connection.*failed|timed? out|timeout|cannot connect|could not connect|DNS/i.test(error)) return uiText("networkConnectionFailedPleaseTryAgain_9bb3");
  if (/SSH|公钥|鉴权|认证|public.key|authentication|authorization/i.test(error)) return uiText("sshConnectionFailedCheckYourConnection_9f5b");
  return error.split(/[\n。；]/)[0].slice(0, 120);
}
