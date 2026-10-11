import { GitDetails } from "./GitDetails";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { GitRepositoryConfig } from "@/lib/git-sync-contract";
import { GitRepositoryForm, type GitDraft } from "./GitRepositoryForm";
import { SettingsSectionCard } from "../SettingsSectionCard";

export function GitSyncSettings({
  config,
  draft,
  disabled,
  actionDisabled,
  saving,
  updateDraft,
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
  removeConfirmation: string;
  setRemoveConfirmation: Dispatch<SetStateAction<string>>;
  onRemove: () => void;
}) {
  if (!config) return null;
  return (
    <SettingsSectionCard className="overflow-hidden p-2">
      <GitDetails title="同步设置" description="自动同步与仓库信息" spacious>
        <div className="px-3 pb-1">
          <div className="max-w-[740px] divide-y divide-border">
            <div className="py-5">
              <GitRepositoryForm
                draft={draft}
                adding={false}
                disabled={disabled}
                saving={saving}
                onChange={updateDraft}
              />
            </div>
            <section className="space-y-4 py-5">
              <h4 className="text-base font-semibold">仓库信息</h4>
              <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-3 text-[15px]">
                <dt className="text-muted-foreground">分支</dt>
                <dd className="break-words">{config.branch}</dd>
                <dt className="text-muted-foreground">SSH 地址</dt>
                <dd className="break-all font-mono text-sm">
                  {config.remoteUrl}
                </dd>
              </dl>
            </section>
            <div className="py-4">
              <div className="flex justify-end">
                <Button
                  className="min-h-[44px] text-danger"
                  variant="ghost"
                  disabled={actionDisabled}
                  onClick={() => setRemoveConfirmation(config.id)}
                >
                  移除同步配置
                </Button>
              </div>
              {removeConfirmation === config.id && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm">
                    移除当前同步配置？本地与远端文件不会删除。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="min-h-[44px]"
                      variant="destructive"
                      disabled={actionDisabled}
                      onClick={onRemove}
                    >
                      确认移除
                    </Button>
                    <Button
                      className="min-h-[44px]"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => setRemoveConfirmation("")}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </GitDetails>
    </SettingsSectionCard>
  );
}
