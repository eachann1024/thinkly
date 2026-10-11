import { GitDetails } from "./GitDetails";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GitRepositoryInput } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

export type GitDraft = Pick<GitRepositoryInput, "provider" | "remoteUrl" | "branch" | "intervalMinutes" | "enabled">;
type GitRepositoryFormProps = {
  draft: GitDraft;
  adding: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
};
function AutomaticSync({ draft, disabled, saving, onChange }: GitRepositoryFormProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-base font-semibold">自动同步</h4>
        {saving &&
          Number.isInteger(draft.intervalMinutes) &&
          draft.intervalMinutes >= 1 &&
          draft.intervalMinutes <= 1440 && (
            <span role="status" className="text-xs text-muted-foreground">
              正在保存…
            </span>
          )}
      </div>
      <Label
        htmlFor="git-sync-enabled"
        className="flex min-h-[64px] w-full cursor-pointer items-center justify-between gap-4"
      >
        <span className="flex flex-1 flex-col justify-center">
          <span className="text-[15px] font-medium">后台自动同步</span>
          <span className="mt-1 text-sm font-normal text-muted-foreground">关闭后仍可手动同步</span>
        </span>
        <Switch
          id="git-sync-enabled"
          checked={draft.enabled}
          disabled={disabled}
          onCheckedChange={(checked) => onChange("enabled", checked)}
        />
      </Label>
      <div className="flex min-h-[44px] items-center justify-between gap-4">
        <Label htmlFor="git-sync-interval" className="text-[15px]">
          同步间隔
        </Label>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            id="git-sync-interval"
            className="h-[44px] w-[88px] text-base"
            type="number"
            min={1}
            max={1440}
            step={1}
            value={draft.intervalMinutes || ""}
            disabled={disabled}
            onChange={(event) => onChange("intervalMinutes", Number(event.target.value))}
          />
          <span className="text-sm text-muted-foreground">分钟</span>
        </div>
      </div>
      {!Number.isInteger(draft.intervalMinutes) || draft.intervalMinutes < 1 || draft.intervalMinutes > 1440 ? (
        <p className="text-sm text-danger">请输入 1–1440 分钟的整数，修正后自动保存。</p>
      ) : null}
    </section>
  );
}
export function GitRepositoryForm(props: GitRepositoryFormProps) {
  const { adding, draft, disabled, onChange } = props;
  if (!adding) return <AutomaticSync {...props} />;
  return (
    <SettingsSectionCard title="连接仓库">
      <div className="space-y-2">
        <Label htmlFor="git-sync-remote">SSH 仓库地址</Label>
        <Input
          id="git-sync-remote"
          className="h-[44px]"
          value={draft.remoteUrl}
          disabled={disabled}
          onChange={(event) => onChange("remoteUrl", event.target.value)}
          placeholder={"git" + "@github.com:用户名/仓库.git"}
          autoComplete="off"
        />
        <p className="text-sm text-muted-foreground">自动识别 GitHub 或 Gitee；在下方选择要同步的文件夹。</p>
      </div>
      <GitDetails title="高级设置">
        <div className="space-y-4 px-3 pb-3">
          <div className="space-y-2">
            <Label htmlFor="git-sync-branch">分支</Label>
            <Input
              id="git-sync-branch"
              className="h-[44px]"
              value={draft.branch}
              disabled={disabled}
              onChange={(event) => onChange("branch", event.target.value)}
            />
          </div>
          <AutomaticSync {...props} />
        </div>
      </GitDetails>
    </SettingsSectionCard>
  );
}
