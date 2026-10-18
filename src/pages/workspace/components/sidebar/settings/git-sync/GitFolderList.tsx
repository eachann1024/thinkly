import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitFolderList.tsx#localMessages:1">`
zh-Hans:
  foldersToSync_19ed: "同步文件夹"
  deselectingAFolderDoesNotDelete_4773: "取消勾选不会删除文件。"
  legacyRepositoriesSupportOnlyOneFolder_76b4: "旧版仓库仅支持一个文件夹。"
  noLocalFoldersAddALocal_8faf: "暂无本地文件夹，请先在侧栏添加本地笔记本。"
  syncFolderLabel: "同步 {{name}} {{path}}{{error}}"
  chooseFolderAgain_b01b: "重新选择文件夹"
  locateIssue_f93a: "定位问题"
en:
  foldersToSync_19ed: "Folders to sync"
  deselectingAFolderDoesNotDelete_4773: "Deselecting a folder does not delete its files."
  legacyRepositoriesSupportOnlyOneFolder_76b4: "Legacy repositories support only one folder."
  noLocalFoldersAddALocal_8faf: "No local folders. Add a local notebook in the sidebar first."
  syncFolderLabel: "Sync {{name}} {{path}}{{error}}"
  chooseFolderAgain_b01b: "Choose folder again"
  locateIssue_f93a: "Locate issue"
ja:
  foldersToSync_19ed: "同期するフォルダ"
  deselectingAFolderDoesNotDelete_4773: "選択を解除してもファイルは削除されません。"
  legacyRepositoriesSupportOnlyOneFolder_76b4: "旧バージョンのリポジトリは1つのフォルダのみ対応しています。"
  noLocalFoldersAddALocal_8faf: "ローカルフォルダがありません。先にサイドバーでローカルノートブックを追加してください。"
  syncFolderLabel: "{{name}} {{path}}{{error}} を同期"
  chooseFolderAgain_b01b: "フォルダを選択し直す"
  locateIssue_f93a: "問題の箇所を表示"
`;
const uiText = createTranslator(localMessages);
import { GitFolderIssue } from "./GitFolderIssue";
import { notebookUnavailableReason, shortFolderReason } from "./gitSyncPresentation";
import { Check } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { DotFrameBox, SettingsDotIcon } from "@/components/ui/dot-matrix";
import type {
  GitFolderCheck,
  GitRepositoryFolder,
} from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

function distinguishingPath(
  folder: GitRepositoryFolder,
  rows: GitRepositoryFolder[],
) {
  const matches = rows.filter((item) => item.name === folder.name);
  if (matches.length < 2) return "";
  const parts = folder.localPath.split(/[\\/]/).filter(Boolean);
  for (let length = 1; length <= parts.length; length++) {
    const suffix = parts.slice(-length).join("/");
    if (
      matches.every(
        (item) =>
          item.notebookId === folder.notebookId ||
          !item.localPath.replace(/\\/g, "/").endsWith(suffix),
      )
    )
      return suffix;
  }
  return folder.localPath;
}

export function GitFolderList({
  rows,
  selected,
  availableIds,
  checks,
  disabled,
  recoveryDisabled,
  legacy,
  onToggle,
  onRecover,
  onLocate,
}: {
  rows: GitRepositoryFolder[];
  selected: GitRepositoryFolder[];
  availableIds: Set<string>;
  checks: Record<string, GitFolderCheck>;
  disabled: boolean;
  recoveryDisabled: boolean;
  legacy: boolean;
  onToggle: (folder: GitRepositoryFolder, checked: boolean) => void;
  onRecover: (folder: GitRepositoryFolder, relocate: boolean) => void;
  onLocate: (folder: GitRepositoryFolder) => void;
}) {
  useLocale();
  return (
    <SettingsSectionCard
      title={uiText("foldersToSync_19ed")}
      description={uiText("deselectingAFolderDoesNotDelete_4773")}
      contentClassName="space-y-2"
    >
      {legacy && (
        <p className="text-sm text-muted-foreground">
          {uiText("legacyRepositoriesSupportOnlyOneFolder_76b4")}</p>
      )}
      {!rows.length && (
        <DotFrameBox className="flex max-w-[300px] flex-col items-start gap-2 p-3.5">
          <SettingsDotIcon name="folderPlus" size={22} className="relative" />
          <p className="relative text-sm text-muted-foreground">
            {uiText("noLocalFoldersAddALocal_8faf")}</p>
        </DotFrameBox>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-2">
        {rows.map((folder) => {
          const checked = selected.some(
            (item) => item.notebookId === folder.notebookId,
          );
          const available = availableIds.has(folder.notebookId);
          const check = checks[folder.localPath];
          const error = !available ? notebookUnavailableReason() : check?.error;
          const displayError = error?.replace(
            /[，。； ]*已停止本次同步[。]?/g,
            "",
          );
          const needsRecovery =
            !available || /不存在|无法匹配|身份|路径已变化|no longer exists|does not exist|not found|missing|not.*match|identity|path.*changed/i.test(error ?? "");
          const shortPath = distinguishingPath(folder, rows);
          const blocked =
            disabled ||
            (!checked && !error && !check) ||
            (!checked && needsRecovery && recoveryDisabled) ||
            (legacy && !checked && selected.length > 0);
          return (
            <div
              key={folder.notebookId}
              className={
                "relative min-w-0 rounded-lg transition-colors " +
                (checked
                  ? "bg-[var(--goose-interactive-selected)]"
                  : "bg-[var(--goose-settings-option-bg)]" +
                    (blocked
                      ? ""
                      : " hover:bg-[var(--goose-interactive-hover)]"))
              }
            >
              <Button
                type="button"
                variant="ghost"
                contentStyle="preserve"
                role="checkbox"
                aria-checked={checked}
                className={
                  "group relative flex w-full min-w-0 items-center justify-start gap-3 rounded-lg px-3 text-left !bg-transparent disabled:!bg-transparent " +
                  (shortPath ? "h-auto py-2" : "h-10") +
                  (error ? " pr-12" : "")
                }
                aria-label={uiText("syncFolderLabel", { name: folder.name, path: folder.localPath, error: error ? `, ${shortFolderReason(error)}` : "" })}
                disabled={blocked}
                onClick={() => {
                  if (!checked && error) {
                    if (needsRecovery) onRecover(folder, true);
                    else onLocate(folder);
                  } else onToggle(folder, !checked);
                }}
              >
                <span
                  aria-hidden="true"
                  className={
                    "flex size-5 shrink-0 items-center justify-center rounded-md border " +
                    (checked
                      ? "border-[var(--goose-interactive-selected-border)] bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]"
                      : "border-border bg-background")
                  }
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1" title={folder.localPath}>
                  <span className="block truncate text-sm font-normal leading-5">
                    {folder.name}
                  </span>
                  {shortPath && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {shortPath}
                    </span>
                  )}
                </span>
              </Button>
              {error && (
                <GitFolderIssue
                  name={folder.name}
                  summary={shortFolderReason(error)}
                  detail={displayError ?? error}
                  actionLabel={
                    needsRecovery
                      ? uiText("chooseFolderAgain_b01b")
                      : uiText("locateIssue_f93a")
                  }
                  actionDisabled={needsRecovery ? recoveryDisabled : disabled}
                  onAction={() =>
                    needsRecovery ? onRecover(folder, true) : onLocate(folder)
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
