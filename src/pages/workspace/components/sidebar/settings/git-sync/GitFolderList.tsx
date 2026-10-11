import { GitDetails } from "./GitDetails";
import { Check } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { GitFolderCheck, GitRepositoryFolder } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

function shortFolderReason(error: string) {
  if (/符号链接/.test(error)) return "包含符号链接，无法同步";
  if (/不存在/.test(error)) return "原文件夹已不存在";
  if (/未打开|无法匹配|身份|路径已变化/.test(error)) return "笔记本未打开或无法匹配";
  if (/权限/.test(error)) return "无法读取文件夹，请检查权限";
  return error.split(/[\n，。；]/)[0].slice(0, 60);
}

function distinguishingPath(folder: GitRepositoryFolder, rows: GitRepositoryFolder[]) {
  const matches = rows.filter((item) => item.name === folder.name);
  if (matches.length < 2) return "";
  const parts = folder.localPath.split(/[\\/]/).filter(Boolean);
  for (let length = 1; length <= parts.length; length++) {
    const suffix = parts.slice(-length).join("/");
    if (
      matches.every(
        (item) => item.notebookId === folder.notebookId || !item.localPath.replace(/\\/g, "/").endsWith(suffix),
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
    <SettingsSectionCard title="同步文件夹" description="取消勾选不会删除文件。" contentClassName="space-y-2">
      {legacy && <p className="text-xs text-muted-foreground">旧版仓库仅支持一个文件夹。</p>}
      {!rows.length && <p className="text-sm text-muted-foreground">暂无本地文件夹，请先在侧栏添加本地笔记本。</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-2">
        {rows.map((folder) => {
          const checked = selected.some((item) => item.notebookId === folder.notebookId);
          const available = availableIds.has(folder.notebookId);
          const check = checks[folder.localPath];
          const error = !available ? "原笔记本未打开或无法匹配" : check?.error;
          const displayError = error?.replace(/[，。； ]*已停止本次同步[。]?/g, "");
          const needsRecovery = !available || /不存在|无法匹配|身份|路径已变化/.test(error ?? "");
          const shortPath = distinguishingPath(folder, rows);
          const blocked =
            disabled ||
            (!checked && (!available || !check || Boolean(error))) ||
            (legacy && !checked && selected.length > 0);
          return (
            <div
              key={folder.notebookId}
              className={
                "min-w-0 rounded-lg border p-3 transition-colors " +
                (checked ? "border-primary/40 bg-primary/10" : "border-transparent bg-muted/50")
              }
            >
              <Button
                type="button"
                variant="ghost"
                role="checkbox"
                aria-checked={checked}
                className="h-auto min-h-6 w-full min-w-0 justify-start gap-2 rounded-lg p-0 text-left hover:bg-transparent"
                aria-label={`同步 ${folder.name} ${folder.localPath}`}
                disabled={blocked}
                onClick={() => onToggle(folder, !checked)}
              >
                <span
                  aria-hidden="true"
                  className={
                    "flex size-5 shrink-0 items-center justify-center rounded-md border " +
                    (checked ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-background")
                  }
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1" title={folder.localPath}>
                  <span className="block truncate text-sm font-medium">{folder.name}</span>
                  {shortPath && <span className="block truncate text-xs text-muted-foreground">{shortPath}</span>}
                </span>
              </Button>
              {error ? (
                <div className="mt-2 space-y-2">
                  <p className={"text-xs " + (checked ? "text-danger" : "text-muted-foreground")}>
                    {shortFolderReason(error)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={needsRecovery ? recoveryDisabled : disabled}
                    onClick={() => (needsRecovery ? onRecover(folder, true) : onLocate(folder))}
                  >
                    {needsRecovery ? "重新选择文件夹" : "定位问题"}
                  </Button>
                  <GitDetails className="text-xs text-muted-foreground" title="问题详情">
                    <p className="mt-1 whitespace-pre-wrap break-all">
                      {check?.path ?? folder.localPath}
                      {"\n"}
                      {displayError}
                    </p>
                  </GitDetails>
                </div>
              ) : !check ? (
                <p className="mt-2 text-xs text-muted-foreground">检查中…</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
