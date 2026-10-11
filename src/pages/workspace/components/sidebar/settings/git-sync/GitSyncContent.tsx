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
  token: string;
  error: string;
  unsavedFolders: boolean;
  unsavedSettings: boolean;
  removeConfirmation: string;
  checking: (id: string) => boolean;
  setRemoveConfirmation: Dispatch<SetStateAction<string>>;
  updateDraft: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
  run: (id: string, label: string, operation: () => Promise<GitSyncState>, onSuccess?: () => void) => Promise<void>;
  toggleFolder: (folder: GitRepositoryFolder, checked: boolean) => void;
  recoverFolder: (folder: GitRepositoryFolder, relocate: boolean) => Promise<void>;
  locateFolder: (folder: GitRepositoryFolder) => Promise<void>;
  connect: () => void;
  checkVisibility: (clear?: boolean) => void;
  onToken: (value: string) => void;
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
  token,
  error,
  unsavedFolders,
  unsavedSettings,
  removeConfirmation,
  checking,
  setRemoveConfirmation,
  updateDraft,
  run,
  toggleFolder,
  recoverFolder,
  locateFolder,
  connect,
  checkVisibility,
  onToken,
  onAdd,
  onSelect,
  onReload,
  onCancel,
  onRemoved,
  onFolderCheck,
}: GitSyncContentProps) {
  const actionDisabled = disabled || unsavedFolders || unsavedSettings;
  const conflicts = status?.conflicts ?? [];
  const syncError = status?.error;
  const folderError = folderErrorCount > 0;
  const settingsProps = {
    config,
    draft,
    disabled,
    actionDisabled,
    saving: unsavedSettings,
    updateDraft,
    checking: checking(id),
    token,
    onToken,
    checkVisibility,
    removeConfirmation,
    setRemoveConfirmation,
    onRemove: () => {
      if (bridge) void run(id, "移除配置", () => bridge.remove(id), onRemoved);
    },
  };
  return (
    <div className="min-w-0 space-y-5">
      {!bridge ? (
        <SettingsSectionCard>
          <p className="text-sm text-muted-foreground">Git 同步仅在桌面版应用中可用。</p>
        </SettingsSectionCard>
      ) : (
        <>
          {loading && (
            <p role="status" className="text-sm text-muted-foreground">
              正在读取同步配置…
            </p>
          )}
          {loadError && (
            <div role="alert" className="space-y-2 text-sm">
              <p className="git-sync-error">读取配置失败：{loadError}</p>
              <Button variant="outline" onClick={onReload}>
                重新读取
              </Button>
            </div>
          )}
          <SettingsSectionCard
            title="仓库"
            actions={
              <Button variant="outline" size="sm" disabled={loading || Boolean(loadError) || adding} onClick={onAdd}>
                添加仓库
              </Button>
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
                    className="h-auto w-full min-w-0 justify-start gap-2 rounded-lg p-3 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate" title={item.remoteUrl}>
                      {name}
                      {differentProvider ? ` · ${item.provider === "github" ? "GitHub" : "Gitee"}` : ""}
                      {sameRepository ? ` · ${item.branch}` : ""}
                    </span>
                    {item.visibility.value === "public" && <span className="text-xs text-danger">公开</span>}
                  </Button>
                );
              })}
              {!loading && !loadError && !state.configs.length && (
                <p className="text-sm text-muted-foreground">添加仓库，选择文件夹后连接并同步。</p>
              )}
            </div>
          </SettingsSectionCard>
          {config?.visibility.value === "public" && (
            <p role="alert" className="rounded-lg bg-muted p-3 text-sm text-danger">
              仓库已公开，同步到仓库的笔记可被他人查看
            </p>
          )}
          {config && (
            <SettingsSectionCard title="同步状态">
              <div role="status" aria-live="polite" className="space-y-2 text-sm">
                <p>{summary}</p>
                <p className="text-muted-foreground">
                  上次同步成功：{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "尚无记录"}
                </p>
              </div>
              {syncError && !conflicts.length && !folderError && (
                <div className="space-y-2 text-sm">
                  <p className="text-danger">{shortSyncError(syncError)}</p>
                  <GitDetails className="text-xs text-muted-foreground" title="错误详情">
                    <p className="mt-2 whitespace-pre-wrap break-words">{syncError}</p>
                  </GitDetails>
                </div>
              )}
              {conflicts.length ? (
                <GitConflicts
                  key={id}
                  repositoryId={id}
                  conflicts={conflicts}
                  bridge={bridge}
                  disabled={disabled}
                  onResolve={(request) => void run(id, "解决冲突并继续同步", () => bridge.resolveConflict(request))}
                />
              ) : (
                <Button
                  variant="outline"
                  disabled={actionDisabled || !folders.length}
                  onClick={() => {
                    onFolderCheck();
                    void run(id, "同步", () => bridge.syncNow(id));
                  }}
                >
                  {status?.phase === "error" || folderError ? "重试" : "立即同步"}
                </Button>
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
                recoveryDisabled={disabled || Boolean(config && (unsavedFolders || unsavedSettings))}
                legacy={config?.layout === "legacy-root"}
                onToggle={toggleFolder}
                onRecover={(folder, relocate) => void recoverFolder(folder, relocate)}
                onLocate={(folder) => void locateFolder(folder)}
              />
              {adding && (
                <div className="flex gap-2">
                  <Button disabled={disabled || !draft.remoteUrl.trim() || !folders.length} onClick={connect}>
                    连接并同步
                  </Button>
                  <Button variant="ghost" disabled={disabled} onClick={onCancel}>
                    取消
                  </Button>
                </div>
              )}
            </>
          )}
          {config && <GitSyncSettings key={id} {...settingsProps} />}
          {error && (
            <div role="alert" className="space-y-2 text-sm">
              <p className="text-danger">{shortSyncError(error)}</p>
              <GitDetails className="text-xs text-muted-foreground" title="错误详情">
                <p className="mt-2 whitespace-pre-wrap break-words">{error}</p>
              </GitDetails>
            </div>
          )}
        </>
      )}
    </div>
  );
}
