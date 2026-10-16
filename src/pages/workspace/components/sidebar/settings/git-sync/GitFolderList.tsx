import { GitFolderIssue } from "./GitFolderIssue";
import { Check } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type {
  GitFolderCheck,
  GitRepositoryFolder,
} from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

function shortFolderReason(error: string) {
  if (/符号链接/.test(error)) return "包含符号链接，无法同步";
  if (/不存在/.test(error)) return "原文件夹已不存在";
  if (/未打开|无法匹配|身份|路径已变化/.test(error))
    return "笔记本未打开或无法匹配";
  if (/权限/.test(error)) return "无法读取文件夹，请检查权限";
  return error.split(/[\n，。；]/)[0].slice(0, 60);
}

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
  return (
    <SettingsSectionCard
      title="同步文件夹"
      description="取消勾选不会删除文件。"
      contentClassName="space-y-2"
    >
      {legacy && (
        <p className="text-sm text-muted-foreground">
          旧版仓库仅支持一个文件夹。
        </p>
      )}
      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          暂无本地文件夹，请先在侧栏添加本地笔记本。
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-2">
        {rows.map((folder) => {
          const checked = selected.some(
            (item) => item.notebookId === folder.notebookId,
          );
          const available = availableIds.has(folder.notebookId);
          const check = checks[folder.localPath];
          const error = !available ? "原笔记本未打开或无法匹配" : check?.error;
          const displayError = error?.replace(
            /[，。； ]*已停止本次同步[。]?/g,
            "",
          );
          const needsRecovery =
            !available || /不存在|无法匹配|身份|路径已变化/.test(error ?? "");
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
                  "group relative flex h-auto min-h-[44px] w-full min-w-0 items-center justify-start gap-3 rounded-lg px-3 py-2 text-left !bg-transparent disabled:!bg-transparent" +
                  (error ? " pr-12" : "")
                }
                aria-label={`同步 ${folder.name} ${folder.localPath}${error ? `，${shortFolderReason(error)}` : ""}`}
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
                  className="pointer-events-none absolute inset-[3px] rounded-[inherit] border-2 border-[var(--goose-accent-outline-focus)] opacity-0 group-focus-visible:opacity-100"
                />
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
                  <span className="block truncate text-[15px] font-medium">
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
                      ? "重新选择文件夹"
                      : "定位问题"
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
