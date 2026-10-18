import { useLocale } from "@/i18n";
import localMessages from "./GitSyncContent.messages.yaml";
import { createTranslator, i18nYaml, getFormatLocale } from "@/i18n";

const uiText = createTranslator(localMessages);
import { localizeGitUiReason, type GitSyncAction } from "./gitSyncUiState";
import { GitDetails } from "./GitDetails";
import { GitSyncSettings } from "./GitSyncSettings";
import { formatFolderIssue, repositoryLabel, shortSyncError } from "./gitSyncPresentation";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { DotDecor, SettingsDotIcon } from "@/components/ui/dot-matrix";
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
  moduleSwitch?: ReactNode;
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
  folderIssues: { name: string; reason: string }[];
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
  moduleSwitch,
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
  folderIssues,
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
  const folderError = folderIssues.length > 0;
  const syncRepeatsFolderIssue = Boolean(syncError && folderIssues.some((issue) => syncError.includes(issue.reason)));
  const reportedFailure = error || (syncRepeatsFolderIssue ? "" : syncError ?? "");
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
      {moduleSwitch}
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
                    className="goose-accent-selection w-full min-w-0 justify-start gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm" title={item.remoteUrl}>
                      {name}
                      {differentProvider ? ` · ${item.provider === "github" ? "GitHub" : "Gitee"}` : ""}
                      {sameRepository ? ` · ${item.branch}` : ""}
                    </span>
                  </Button>
                );
              })}
              {!loading && !loadError && !state.configs.length && (
                <div className="relative flex flex-col items-center gap-2.5 overflow-hidden py-8 text-center">
                  <DotDecor preset="gitRepos" compact />
                  <SettingsDotIcon name="branch" size={32} className="relative" />
                  <p className="relative text-sm text-muted-foreground">{uiText("addARepositoryChooseFoldersThen_a359")}</p>
                </div>
              )}
            </div>
          </SettingsSectionCard>
          {config && (
            <SettingsSectionCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div role="status" aria-live="polite" className="space-y-2 text-sm">
                  <p className="text-[15px] font-semibold leading-[22px]">{summary}</p>
                  <p className="text-muted-foreground">
                    {uiText("lastSuccessfulSync_28c1")}{status?.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString(getFormatLocale()) : uiText("noHistoryYet_5dbb")}
                  </p>
                </div>
                {!conflicts.length && (
                  <Button
                    variant="outline"
                    disabled={disabled || !folders.length}
                    onClick={() => {
                      onFolderCheck();
                      void run(id, "sync", () => bridge.syncNow(id));
                    }}
                  >
                    {status?.phase === "error" || folderError || error ? uiText("retry_132c") : uiText("syncNow_5f71")}
                  </Button>
                )}
              </div>
              {folderIssues.length > 1 && (
                <div className="space-y-1 text-sm">
                  {folderIssues.map((issue) => (
                    <p key={`${issue.name}:${issue.reason}`} className="text-danger">
                      {formatFolderIssue(issue.name, issue.reason)}
                    </p>
                  ))}
                </div>
              )}
              {reportedFailure && !conflicts.length && shortSyncError(reportedFailure) !== summary && (
                <p className="text-sm text-danger">{shortSyncError(reportedFailure)}</p>
              )}
              {reportedFailure && !conflicts.length && reportedFailure !== shortSyncError(reportedFailure) && (
                <GitDetails className="text-sm text-muted-foreground" title={uiText("errorDetails_71f6")}>
                  <p className="mt-2 whitespace-pre-wrap break-words">{reportedFailure}</p>
                </GitDetails>
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
                    disabled={disabled || !draft.remoteUrl.trim() || !folders.length}
                    onClick={connect}
                  >
                    {uiText("connectAndSync_9751")}</Button>
                  <Button variant="ghost" disabled={disabled} onClick={onCancel}>
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
