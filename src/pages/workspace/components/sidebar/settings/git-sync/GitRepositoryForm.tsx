import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitRepositoryForm.tsx#localMessages:1">`
zh-Hans:
  automaticBackgroundSync_2b6d: "后台自动同步"
  saving_9b80: "正在保存…"
  syncInterval_2543: "同步间隔"
  minutes_3a17: "分钟"
  enterAWholeNumberFrom1_2a07: "请输入 1–1440 之间的整数。"
  connectRepository_9d8e: "连接仓库"
  sshRepositoryUrl_79e4: "SSH 仓库地址"
  advancedSettings_e370: "高级设置"
  branch_bfc0: "分支"
  sshPlaceholder: "git@github.com:username/repository.git"
en:
  automaticBackgroundSync_2b6d: "Automatic background sync"
  saving_9b80: "Saving…"
  syncInterval_2543: "Sync interval"
  minutes_3a17: "minutes"
  enterAWholeNumberFrom1_2a07: "Enter a whole number from 1 to 1440."
  connectRepository_9d8e: "Connect repository"
  sshRepositoryUrl_79e4: "SSH repository URL"
  advancedSettings_e370: "Advanced settings"
  branch_bfc0: "Branch"
  sshPlaceholder: "git@github.com:username/repository.git"
ja:
  automaticBackgroundSync_2b6d: "バックグラウンド自動同期"
  saving_9b80: "保存中…"
  syncInterval_2543: "同期間隔"
  minutes_3a17: "分"
  enterAWholeNumberFrom1_2a07: "1～1440 の整数を入力してください。"
  connectRepository_9d8e: "リポジトリに接続"
  sshRepositoryUrl_79e4: "SSH リポジトリ URL"
  advancedSettings_e370: "詳細設定"
  branch_bfc0: "ブランチ"
  sshPlaceholder: "git@github.com:username/repository.git"
`;
const uiText = createTranslator(localMessages);
import { GitDetails } from "./GitDetails";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GitRepositoryInput } from "@/lib/git-sync-contract";
import { SettingsSectionCard } from "../SettingsSectionCard";

export type GitDraft = Pick<
  GitRepositoryInput,
  "provider" | "remoteUrl" | "branch" | "intervalMinutes" | "enabled"
>;
type GitRepositoryFormProps = {
  draft: GitDraft;
  adding: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
};
function AutomaticSync({
  draft,
  disabled,
  saving,
  onChange,
}: GitRepositoryFormProps) {
  useLocale();
  return (
    <section className="space-y-3">
      <Label
        htmlFor="git-sync-enabled"
        className="flex min-h-[64px] w-full cursor-pointer items-center justify-between gap-4"
      >
        <span className="flex flex-1 flex-col justify-center">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-medium">
            {uiText("automaticBackgroundSync_2b6d")}{saving &&
              Number.isInteger(draft.intervalMinutes) &&
              draft.intervalMinutes >= 1 &&
              draft.intervalMinutes <= 1440 && (
                <span
                  role="status"
                  className="text-sm font-normal text-muted-foreground"
                >
                  {uiText("saving_9b80")}</span>
              )}
          </span>
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
          {uiText("syncInterval_2543")}</Label>
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
            onChange={(event) =>
              onChange("intervalMinutes", Number(event.target.value))
            }
          />
          <span className="text-sm text-muted-foreground">{uiText("minutes_3a17")}</span>
        </div>
      </div>
      {!Number.isInteger(draft.intervalMinutes) ||
      draft.intervalMinutes < 1 ||
      draft.intervalMinutes > 1440 ? (
        <p className="text-sm text-danger">
          {uiText("enterAWholeNumberFrom1_2a07")}</p>
      ) : null}
    </section>
  );
}
export function GitRepositoryForm(props: GitRepositoryFormProps) {
  useLocale();
  const { adding, draft, disabled, onChange } = props;
  if (!adding) return <AutomaticSync {...props} />;
  return (
    <SettingsSectionCard title={uiText("connectRepository_9d8e")}>
      <div className="space-y-2">
        <Label htmlFor="git-sync-remote">{uiText("sshRepositoryUrl_79e4")}</Label>
        <Input
          id="git-sync-remote"
          className="h-[44px]"
          value={draft.remoteUrl}
          disabled={disabled}
          onChange={(event) => onChange("remoteUrl", event.target.value)}
          placeholder={uiText("sshPlaceholder")}
          autoComplete="off"
        />
      </div>
      <GitDetails title={uiText("advancedSettings_e370")}>
        <div className="space-y-4 px-3 pb-3">
          <div className="space-y-2">
            <Label htmlFor="git-sync-branch">{uiText("branch_bfc0")}</Label>
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
