import { localizeSavedGitError } from "@/lib/git-display-errors";
import { createTranslator, getLocale, i18nYaml } from "@/i18n";

const messages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/gitSyncUiState.ts#messages:1">`
zh-Hans:
  save-selection: "保存选择并同步"
  save-settings: "自动保存设置"
  connect: "连接并同步"
  restore: "恢复文件夹"
  remove: "移除配置"
  sync: "同步"
  resolve: "解决冲突并继续同步"
  failed: "{{action}}失败：{{error}}"
  selectFolders: "请先选择至少一个同步文件夹"
  unknown: "操作失败，请重试"
  duplicateRepository: "此仓库分支已有同步配置，请选择已有仓库"
  openPicker: "无法打开文件夹选择器，请重新启动桌面应用"
  readFolder: "文件夹读取失败"
en:
  save-selection: "Save selection and sync"
  save-settings: "Saving settings automatically"
  connect: "Connect and sync"
  restore: "Restore folder"
  remove: "Remove configuration"
  sync: "Sync"
  resolve: "Resolve conflicts and resume sync"
  failed: "{{action}} failed: {{error}}"
  selectFolders: "Select at least one folder to sync"
  unknown: "Operation failed. Please try again."
  duplicateRepository: "This repository branch already has a sync configuration. Select the existing repository."
  openPicker: "Could not open the folder picker. Restart the desktop app."
  readFolder: "Could not read folder"
ja:
  "save-selection": "選択を保存して同期"
  "save-settings": "設定を自動保存"
  connect: "接続して同期"
  restore: "フォルダを復元"
  remove: "設定を削除"
  sync: "同期"
  resolve: "競合を解決して同期を再開"
  failed: "{{action}}に失敗しました：{{error}}"
  selectFolders: "同期するフォルダを1つ以上選択してください"
  unknown: "操作に失敗しました。もう一度お試しください"
  duplicateRepository: "このリポジトリのブランチには既に同期設定があります。既存のリポジトリを選択してください"
  openPicker: "フォルダ選択ダイアログを開けませんでした。デスクトップアプリを再起動してください"
  readFolder: "フォルダを読み込めませんでした"
`;
const t = createTranslator(messages);
export type GitSyncAction = "save-selection" | "save-settings" | "connect" | "restore" | "remove" | "sync" | "resolve";
export type GitSyncUiFailure =
  | { kind: "selection" }
  | { kind: "operation"; action: GitSyncAction; reason: string }
  | { kind: "raw"; reason: string };

export function localizeGitUiReason(reason: string) {
  for (const key of ["unknown", "duplicateRepository", "openPicker", "readFolder"] as const) {
    if (reason === messages.en[key] || reason === messages["zh-Hans"][key] || reason === messages.ja[key]) return messages[getLocale()][key];
  }
  return localizeSavedGitError(reason);
}
export const gitSyncActionLabel = (action: GitSyncAction) => t(action);
export const captureGitFailureReason = (error: unknown) =>
  error instanceof Error ? error.message : error ? String(error) : "";
export function formatGitUiFailure(failure: GitSyncUiFailure | undefined) {
  if (!failure) return "";
  if (failure.kind === "selection") return t("selectFolders");
  const error = localizeGitUiReason(failure.reason) || t("unknown");
  return failure.kind === "operation" ? t("failed", { action: gitSyncActionLabel(failure.action), error }) : error;
}
