import { GitConnectionHelp } from "./GitConnectionHelp";
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
import { GitVisibility, VisibilityBadge } from "./GitVisibility";
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
  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">Git 同步</h3>
        <p className="mt-1 text-sm text-muted-foreground">连接 GitHub 或 Gitee，自动同步本地笔记本。</p>
      </div>
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
              <Button
                variant="outline"
                onClick={() => {
                  onReload();
                }}
              >
                重新读取
              </Button>
            </div>
          )}
          <SettingsSectionCard
            title="仓库"
            actions={
              <Button
                variant="outline"
                size="sm"
                disabled={loading || Boolean(loadError) || adding}
                onClick={() => {
                  onAdd();
                }}
              >
                添加仓库
              </Button>
            }
          >
            <div className="space-y-2">
              {state.configs.map((item) => (
                <Button
                  key={item.id}
                  variant={config?.id === item.id ? "secondary" : "outline"}
                  aria-pressed={config?.id === item.id}
                  onClick={() => {
                    onSelect(item.id);
                  }}
                  className="h-auto w-full min-w-0 flex-wrap justify-start gap-2 rounded-lg p-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" title={item.remoteUrl}>
                      {item.remoteUrl}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {item.branch} · {item.folders.length} 个文件夹
                    </span>
                  </span>
                  <VisibilityBadge config={item} checking={checking(item.id)} />
                </Button>
              ))}
              {!loading && !loadError && !state.configs.length && (
                <p className="text-sm text-muted-foreground">添加仓库，选择文件夹后连接并同步。</p>
              )}
            </div>
          </SettingsSectionCard>
          {config && (
            <SettingsSectionCard title="同步状态">
              <div role="status" aria-live="polite" className="space-y-2 text-sm">
                <p>{summary}</p>
                <p className="text-muted-foreground">
                  上次成功：{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "尚无记录"}
                </p>
              </div>
              {status?.error && (
                <p
                  role="alert"
                  className="git-sync-error whitespace-pre-wrap break-words rounded-lg border p-3 text-sm"
                >
                  {status.error}
                </p>
              )}
              {Boolean(status?.conflicts?.length) && (
                <GitConflicts
                  key={id}
                  repositoryId={id}
                  conflicts={status!.conflicts!}
                  bridge={bridge}
                  disabled={disabled}
                  onResolve={(request) => void run(id, "解决冲突并继续同步", () => bridge.resolveConflict(request))}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={actionDisabled || !folders.length || Boolean(status?.conflicts?.length)}
                  onClick={() => {
                    onFolderCheck();
                    void run(id, "重新检查并同步", () => bridge.syncNow(id));
                  }}
                >
                  重新检查并同步
                </Button>
                <Button variant="ghost" disabled={actionDisabled} onClick={() => setRemoveConfirmation(id)}>
                  移除配置
                </Button>
              </div>
              {removeConfirmation === id && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground">仅移除同步配置与访问凭据，本地与远端文件保留。</p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={disabled}
                      onClick={() => void run(id, "移除配置", () => bridge.remove(id), onRemoved)}
                    >
                      确认移除
                    </Button>
                    <Button variant="outline" disabled={disabled} onClick={() => setRemoveConfirmation("")}>
                      取消
                    </Button>
                  </div>
                </div>
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
                recoveryDisabled={actionDisabled}
                legacy={config?.layout === "legacy-root"}
                onToggle={toggleFolder}
                onCheck={onFolderCheck}
                onRecover={(folder, relocate) => void recoverFolder(folder, relocate)}
                onLocate={(folder) => void locateFolder(folder)}
              />
              {adding ? (
                <div className="flex gap-2">
                  <Button disabled={disabled || !draft.remoteUrl.trim() || !folders.length} onClick={connect}>
                    连接并同步
                  </Button>
                  <Button variant="ghost" disabled={disabled} onClick={onCancel}>
                    取消
                  </Button>
                </div>
              ) : (
                <GitRepositoryForm
                  draft={draft}
                  adding={false}
                  disabled={disabled}
                  saving={unsavedSettings}
                  onChange={updateDraft}
                />
              )}
            </>
          )}
          {config && (
            <GitVisibility
              key={id}
              config={config}
              checking={checking(id)}
              disabled={disabled}
              token={token}
              onToken={onToken}
              onCheck={checkVisibility}
            />
          )}
          {error && (
            <p role="alert" className="git-sync-error rounded-lg border p-3 text-sm">
              {error}
            </p>
          )}
        </>
      )}
      <GitConnectionHelp />
    </div>
  );
}
