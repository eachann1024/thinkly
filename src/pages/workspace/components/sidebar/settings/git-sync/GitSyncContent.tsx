import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml, getFormatLocale } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitSyncContent.tsx#localMessages:1">`
zh-Hans:
  removeConfiguration_9285: "移除配置"
  gitSyncIsAvailableInThe_bf2b: "Git 同步仅在桌面版应用中可用。"
  loadingSyncConfiguration_41ae: "正在读取同步配置…"
  reload_9e56: "重新读取"
  repository_c270: "仓库"
  addRepository_7135: "添加仓库"
  addARepositoryChooseFoldersThen_a359: "添加仓库，选择文件夹后连接并同步。"
  lastSuccessfulSync_28c1: "上次同步成功："
  noHistoryYet_5dbb: "尚无记录"
  sync_6a62: "同步"
  retry_132c: "重试"
  syncNow_5f71: "立即同步"
  errorDetails_71f6: "错误详情"
  resolveConflictsAndResumeSync_6864: "解决冲突并继续同步"
  connectAndSync_9751: "连接并同步"
  cancel_625f: "取消"
  readFailed: "读取配置失败：{{error}}"
en:
  removeConfiguration_9285: "Remove configuration"
  gitSyncIsAvailableInThe_bf2b: "Git sync is available in the desktop app only."
  loadingSyncConfiguration_41ae: "Loading sync configuration…"
  reload_9e56: "Reload"
  repository_c270: "Repository"
  addRepository_7135: "Add repository"
  addARepositoryChooseFoldersThen_a359: "Add a repository, choose folders, then connect and sync."
  lastSuccessfulSync_28c1: "Last successful sync:"
  noHistoryYet_5dbb: "No history yet"
  sync_6a62: "Sync"
  retry_132c: "Retry"
  syncNow_5f71: "Sync now"
  errorDetails_71f6: "Error details"
  resolveConflictsAndResumeSync_6864: "Resolve conflicts and resume sync"
  connectAndSync_9751: "Connect and sync"
  cancel_625f: "Cancel"
  readFailed: "Could not read configuration: {{error}}"
`;
const uiText = createTranslator(localMessages);
import { localizeGitUiReason, type GitSyncAction } from "./gitSyncUiState";
import { GitDetails } from "./GitDetails";
import { GitSyncSettings } from "./GitSyncSettings";
import { repositoryLabel, shortSyncError } from "./gitSyncPresentation";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type {
  GitRepositoryConfig,
  GitRepositoryFolder,
  GitSyncBridge,
  GitSyncState,
  GitSyncStatus,
  GitFolderCheck,
} from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";
import { GitRepositoryForm, type GitDraft } from "./GitRepositoryForm";
import { GitFolderList } from "./GitFolderList";
import { GitConflicts } from "./GitConflicts";
export interface GitSyncContentProps {
  bridge: GitSyncBridge | undefined;
  state: GitSyncState;
  config: GitRepositoryConfig | undefined;
  id: string;
  loading: boolean;
  loadError: string;
  adding: boolean;
  disabled: boolean;
  selectionDisabled: boolean;
  status: GitSyncStatus | undefined;
  summary: string;
  folderErrorCount: number;
  rows: GitRepositoryFolder[];
  folders: GitRepositoryFolder[];
  availableIds: Set<string>;
  folderChecks: Record<string, GitFolderCheck>;
  draft: GitDraft;
  error: string;
  unsavedFolders: boolean;
  unsavedSettings: boolean;
  removeConfirmation: string;
  setRemoveConfirmation: Dispatch<SetStateAction<string>>;
  updateDraft: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
  run: (id: string, action: GitSyncAction, operation: () => Promise<GitSyncState>, onSuccess?: () => void) => Promise<void>;
  toggleFolder: (folder: GitRepositoryFolder, checked: boolean) => void;
  recoverFolder: (folder: GitRepositoryFolder, relocate: boolean) => Promise<void>;
  locateFolder: (folder: GitRepositoryFolder) => Promise<void>;
  connect: () => void;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onReload: () => void;
  onCancel: () => void;
  onRemoved: () => void;
  onFolderCheck: () => void;
}
export function GitSyncContent({
  bridge,
  state,
  config,
  id,
  loading,
  loadError,
  adding,
  disabled,
  selectionDisabled,
  status,
  summary,
  folderErrorCount,
  rows,
  folders,
  availableIds,
  folderChecks,
  draft,
  error,
  unsavedFolders,
  unsavedSettings,
  removeConfirmation,
  setRemoveConfirmation,
  updateDraft,
  run,
  toggleFolder,
  recoverFolder,
  locateFolder,
  connect,
  onAdd,
  onSelect,
  onReload,
  onCancel,
  onRemoved,
  onFolderCheck,
}: GitSyncContentProps) {
  useLocale();
  const actionDisabled = disabled || unsavedFolders || unsavedSettings;
  const conflicts = status?.conflicts ?? [];
  const syncError = status?.error ? localizeGitUiReason(status.error) : undefined;
  const folderError = folderErrorCount > 0;
  const settingsProps = {
    config,
    draft,
    disabled,
    actionDisabled,
    saving: unsavedSettings,
    updateDraft,
    removeConfirmation,
    setRemoveConfirmation,
    onRemove: () => {
      if (bridge) void run(id, "remove", () => bridge.remove(id), onRemoved);
    },
  };
  return (
    <div className="w-full max-w-[860px] min-w-0 space-y-5">
      {!bridge ? (
        <SettingsSectionCard>
          <p className="text-sm text-muted-foreground">{uiText("gitSyncIsAvailableInThe_bf2b")}</p>
        </SettingsSectionCard>
      ) : (
        <>
          {loading && (
            <p role="status" className="text-sm text-muted-foreground">
              {uiText("loadingSyncConfiguration_41ae")}</p>
          )}
          {loadError && (
            <div role="alert" className="space-y-2 text-sm">
              <p className="git-sync-error">{uiText("readFailed", { error: loadError })}</p>
              <Button variant="outline" onClick={onReload}>
                {uiText("reload_9e56")}</Button>
            </div>
          )}
          <SettingsSectionCard
            title={uiText("repository_c270")}
            actions={
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                disabled={loading || Boolean(loadError) || adding}
                onClick={onAdd}
              >
                {uiText("addRepository_7135")}</Button>
            }
          >
            <div className="space-y-2">
              {state.configs.map((item) => {
                const name = repositoryLabel(item.remoteUrl);
                const namesakes = state.configs.filter((other) => repositoryLabel(other.remoteUrl) === name);
                const sameRepository = namesakes.length > 1;
                const differentProvider = namesakes.some((other) => other.provider !== item.provider);
                return (
                  <Button
                    key={item.id}
                    variant={config?.id === item.id ? "secondary" : "outline"}
                    aria-pressed={config?.id === item.id}
                    onClick={() => onSelect(item.id)}
                    className="goose-accent-selection h-auto min-h-[44px] w-full min-w-0 justify-start gap-2 rounded-lg p-3 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate" title={item.remoteUrl}>
                      {name}
                      {differentProvider ? ` · ${item.provider === "github" ? "GitHub" : "Gitee"}` : ""}
                      {sameRepository ? ` · ${item.branch}` : ""}
                    </span>
                  </Button>
                );
              })}
              {!loading && !loadError && !state.configs.length && (
                <p className="text-sm text-muted-foreground">{uiText("addARepositoryChooseFoldersThen_a359")}</p>
              )}
            </div>
          </SettingsSectionCard>
          {config && (
            <SettingsSectionCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div role="status" aria-live="polite" className="space-y-2 text-sm">
                  <p className="text-base font-semibold">{summary}</p>
                  <p className="text-muted-foreground">
                    {uiText("lastSuccessfulSync_28c1")}{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString(getFormatLocale()) : uiText("noHistoryYet_5dbb")}
                  </p>
                </div>
                {!conflicts.length && (
                  <Button
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={actionDisabled || !folders.length}
                    onClick={() => {
                      onFolderCheck();
                      void run(id, "sync", () => bridge.syncNow(id));
                    }}
                  >
                    {status?.phase === "error" || folderError ? uiText("retry_132c") : uiText("syncNow_5f71")}
                  </Button>
                )}
              </div>
              {syncError && !conflicts.length && !folderError && (
                <div className="space-y-2 text-sm">
                  <p className="text-danger">{shortSyncError(syncError)}</p>
                  <GitDetails className="text-sm text-muted-foreground" title={uiText("errorDetails_71f6")}>
                    <p className="mt-2 whitespace-pre-wrap break-words">{syncError}</p>
                  </GitDetails>
                </div>
              )}
              {conflicts.length > 0 && (
                <GitConflicts
                  key={id}
                  repositoryId={id}
                  conflicts={conflicts}
                  bridge={bridge}
                  disabled={disabled}
                  onResolve={(request) => void run(id, "resolve", () => bridge.resolveConflict(request))}
                />
              )}
            </SettingsSectionCard>
          )}
          {(config || adding) && (
            <>
              {adding && (
                <GitRepositoryForm draft={draft} adding disabled={disabled} saving={false} onChange={updateDraft} />
              )}
              <GitFolderList
                rows={rows}
                selected={folders}
                availableIds={availableIds}
                checks={folderChecks}
                disabled={selectionDisabled}
                recoveryDisabled={disabled}
                legacy={config?.layout === "legacy-root"}
                onToggle={toggleFolder}
                onRecover={(folder, relocate) => void recoverFolder(folder, relocate)}
                onLocate={(folder) => void locateFolder(folder)}
              />
              {adding && (
                <div className="flex gap-2">
                  <Button
                    className="min-h-[44px]"
                    disabled={disabled || !draft.remoteUrl.trim() || !folders.length}
                    onClick={connect}
                  >
                    {uiText("connectAndSync_9751")}</Button>
                  <Button className="min-h-[44px]" variant="ghost" disabled={disabled} onClick={onCancel}>
                    {uiText("cancel_625f")}</Button>
                </div>
              )}
            </>
          )}
          {config && <GitSyncSettings key={id} {...settingsProps} />}
          {error && (
            <div role="alert" className="space-y-2 text-sm">
              <p className="text-danger">{shortSyncError(error)}</p>
              <GitDetails className="text-sm text-muted-foreground" title={uiText("errorDetails_71f6")}>
                <p className="mt-2 whitespace-pre-wrap break-words">{error}</p>
              </GitDetails>
            </div>
          )}
        </>
      )}
    </div>
  );
}
