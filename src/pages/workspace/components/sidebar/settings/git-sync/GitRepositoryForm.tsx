import { GitDetails } from "./GitDetails";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GitRepositoryInput } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

export type GitDraft = Pick<GitRepositoryInput, "provider" | "remoteUrl" | "branch" | "intervalMinutes" | "enabled">;
function AdvancedSettings({ adding, saving, children }: { adding: boolean; saving: boolean; children: ReactNode }) {
  return adding ? (
    <GitDetails title="高级设置">{children}</GitDetails>
  ) : (
    <div>
      {saving && <p className="text-xs text-muted-foreground">正在保存…</p>}
      {children}
    </div>
  );
}
export function GitRepositoryForm({
  draft,
  adding,
  disabled,
  saving,
  onChange,
}: {
  draft: GitDraft;
  adding: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
}) {
  return (
    <SettingsSectionCard title={adding ? "连接仓库" : undefined}>
      {adding && (
        <div className="space-y-2">
          <Label htmlFor="git-sync-remote">SSH 仓库地址</Label>
          <Input
            id="git-sync-remote"
            value={draft.remoteUrl}
            disabled={disabled}
            onChange={(event) => onChange("remoteUrl", event.target.value)}
            placeholder={"git" + "@github.com:用户名/仓库.git"}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">自动识别 GitHub 或 Gitee；在下方选择要同步的文件夹。</p>
        </div>
      )}
      <AdvancedSettings adding={adding} saving={saving}>
        <div className="mt-3 space-y-4">
          {adding && (
            <div className="space-y-2">
              <Label htmlFor="git-sync-branch">分支</Label>
              <Input
                id="git-sync-branch"
                value={draft.branch}
                disabled={disabled}
                onChange={(event) => onChange("branch", event.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="git-sync-interval">自动同步间隔（分钟）</Label>
            <Input
              id="git-sync-interval"
              type="number"
              min={1}
              max={1440}
              step={1}
              value={draft.intervalMinutes || ""}
              disabled={disabled}
              onChange={(event) => onChange("intervalMinutes", Number(event.target.value))}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
            <div>
              <Label htmlFor="git-sync-enabled">自动同步</Label>
              <p className="mt-1 text-xs text-muted-foreground">有效设置自动保存；关闭后仍可手动同步。</p>
            </div>
            <Switch
              id="git-sync-enabled"
              checked={draft.enabled}
              disabled={disabled}
              onCheckedChange={(checked) => onChange("enabled", checked)}
            />
          </div>
          {!Number.isInteger(draft.intervalMinutes) || draft.intervalMinutes < 1 || draft.intervalMinutes > 1440 ? (
            <p className="text-xs text-danger">请输入 1–1440 分钟的整数，修正后自动保存。</p>
          ) : null}
        </div>
      </AdvancedSettings>
    </SettingsSectionCard>
  );
}
