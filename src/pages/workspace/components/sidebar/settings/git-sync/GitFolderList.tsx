import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { GitFolderCheck, GitRepositoryFolder } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

function shortFolderReason(error: string) {
  if (/符号链接/.test(error)) return "包含符号链接";
  if (/不存在/.test(error)) return "原文件夹已不存在";
  if (/未打开|无法匹配|身份|路径已变化/.test(error)) return "笔记本未打开或无法匹配";
  if (/权限/.test(error)) return "无法读取文件夹，请检查权限";
  return error.split(/[\n，。；]/)[0].slice(0, 60);
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
  onCheck,
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
  onCheck: () => void;
  onRecover: (folder: GitRepositoryFolder, relocate: boolean) => void;
  onLocate: (folder: GitRepositoryFolder) => void;
}) {
  return (
    <SettingsSectionCard
      title="同步文件夹"
      description="连续勾选会合并保存并同步；取消勾选不会删除文件。"
      contentClassName="space-y-2"
      actions={
        <Button variant="ghost" size="sm" disabled={disabled} onClick={onCheck}>
          重新检查
        </Button>
      }
    >
      {legacy && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          旧版仓库只支持原来的一个文件夹；多个文件夹请添加新的仓库配置。
        </p>
      )}
      {!rows.length && <p className="text-sm text-muted-foreground">暂无本地文件夹，请先在侧栏添加本地笔记本。</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] items-start gap-2">
        {rows.map((folder) => {
          const checked = selected.some((item) => item.notebookId === folder.notebookId);
          const available = availableIds.has(folder.notebookId);
          const check = checks[folder.localPath];
          const error = !available ? "原笔记本未打开或无法匹配" : check?.error;
          const displayError = checked ? error : error?.replace(/[，。； ]*已停止本次同步[。]?/g, "");
          const shortReason = error ? shortFolderReason(error) : "";
          const needsRecovery = !available || /不存在|无法匹配|身份|路径已变化/.test(error ?? "");
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
              <Checkbox
                className="min-h-6 w-full min-w-0 items-center gap-2"
                aria-label={`同步 ${folder.name} ${folder.localPath}`}
                isSelected={checked}
                isDisabled={blocked}
                onChange={(value) => onToggle(folder, value)}
              >
                <Checkbox.Control className="shrink-0">
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" title={folder.name}>
                    {folder.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground" title={folder.localPath}>
                    {folder.localPath}
                  </span>
                </span>
              </Checkbox>
              {error ? (
                <div className="mt-2 space-y-2">
                  <p className={"text-xs font-medium " + (checked ? "text-danger" : "text-muted-foreground")}>
                    {checked ? "同步受阻" : "无法加入同步"}
                  </p>
                  <p className="text-xs text-muted-foreground">{shortReason}</p>
                  {check?.path && check.path !== folder.localPath && (
                    <p className="truncate text-xs text-muted-foreground" title={check.path}>
                      {check.path}
                    </p>
                  )}
                  {displayError && displayError !== shortReason && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">问题详情</summary>
                      <p className="mt-1 whitespace-pre-wrap break-all">{displayError}</p>
                    </details>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {needsRecovery && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={recoveryDisabled}
                          onClick={() => onRecover(folder, false)}
                        >
                          重新打开
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={recoveryDisabled}
                          onClick={() => onRecover(folder, true)}
                        >
                          重新关联
                        </Button>
                      </>
                    )}
                    {!needsRecovery && (
                      <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onLocate(folder)}>
                        定位问题
                      </Button>
                    )}
                    {checked && (
                      <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onToggle(folder, false)}>
                        解除同步
                      </Button>
                    )}
                  </div>
                </div>
              ) : !check ? (
                <p className="mt-2 text-xs text-muted-foreground">检查中…</p>
              ) : checked ? (
                <p className="mt-2 text-xs text-muted-foreground">已加入同步</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </SettingsSectionCard>
  );
}
