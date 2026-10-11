import { GitDetails } from "./GitDetails";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { GitRepositoryConfig } from "@/lib/git-sync-contract";
import { GitRepositoryForm, type GitDraft } from "./GitRepositoryForm";
import { GitVisibility } from "./GitVisibility";
import { GitConnectionHelp } from "./GitConnectionHelp";
import { SettingsSectionCard } from "../SettingsSectionCard";

export function GitSyncSettings({
  config,
  draft,
  disabled,
  actionDisabled,
  saving,
  updateDraft,
  checking,
  token,
  onToken,
  checkVisibility,
  removeConfirmation,
  setRemoveConfirmation,
  onRemove,
}: {
  config: GitRepositoryConfig | undefined;
  draft: GitDraft;
  disabled: boolean;
  actionDisabled: boolean;
  saving: boolean;
  updateDraft: <K extends keyof GitDraft>(key: K, value: GitDraft[K]) => void;
  checking: boolean;
  token: string;
  onToken: (value: string) => void;
  checkVisibility: (clear?: boolean) => void;
  removeConfirmation: string;
  setRemoveConfirmation: Dispatch<SetStateAction<string>>;
  onRemove: () => void;
}) {
  if (!config) return null;
  return (
    <SettingsSectionCard>
      <GitDetails title="同步设置">
        <div className="mt-4 space-y-4">
          <div className="space-y-1 text-sm">
            <p className="break-all">SSH 地址：{config.remoteUrl}</p>
            <p>分支：{config.branch}</p>
          </div>
          <GitRepositoryForm draft={draft} adding={false} disabled={disabled} saving={saving} onChange={updateDraft} />
          <GitVisibility
            config={config}
            checking={checking}
            disabled={disabled}
            token={token}
            onToken={onToken}
            onCheck={checkVisibility}
          />
          <GitConnectionHelp />
          <Button variant="ghost" disabled={actionDisabled} onClick={() => setRemoveConfirmation(config.id)}>
            移除配置
          </Button>
          {removeConfirmation === config.id && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm text-muted-foreground">仅移除同步配置与访问凭据，本地与远端文件保留。</p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={actionDisabled} onClick={onRemove}>
                  确认移除
                </Button>
                <Button variant="outline" disabled={disabled} onClick={() => setRemoveConfirmation("")}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </GitDetails>
    </SettingsSectionCard>
  );
}
