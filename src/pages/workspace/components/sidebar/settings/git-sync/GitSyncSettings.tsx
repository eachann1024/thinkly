import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/git-sync/GitSyncSettings.tsx#localMessages:1">`
zh-Hans:
  syncSettings_1cbb: "同步设置"
  repositoryDetails_22cd: "仓库信息"
  branch_bfc0: "分支"
  sshUrl_4436: "SSH 地址"
  removeSyncConfiguration_dcd6: "移除同步配置"
  removeThisSyncConfigurationLocalAnd_4136: "移除当前同步配置？本地与远端文件不会删除。"
  remove_e2cf: "确认移除"
  cancel_625f: "取消"
en:
  syncSettings_1cbb: "Sync settings"
  repositoryDetails_22cd: "Repository details"
  branch_bfc0: "Branch"
  sshUrl_4436: "SSH URL"
  removeSyncConfiguration_dcd6: "Remove sync configuration"
  removeThisSyncConfigurationLocalAnd_4136: "Remove this sync configuration? Local and remote files will be kept."
  remove_e2cf: "Remove"
  cancel_625f: "Cancel"
ja:
  syncSettings_1cbb: "同期設定"
  repositoryDetails_22cd: "リポジトリ情報"
  branch_bfc0: "ブランチ"
  sshUrl_4436: "SSH URL"
  removeSyncConfiguration_dcd6: "同期設定を削除"
  removeThisSyncConfigurationLocalAnd_4136: "この同期設定を削除しますか？ローカルとリモートのファイルは削除されません。"
  remove_e2cf: "削除"
  cancel_625f: "キャンセル"
`;
const uiText = createTranslator(localMessages);
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
  useLocale();
  if (!config) return null;
  return (
    <SettingsSectionCard className="overflow-hidden p-0">
      <GitDetails className="[&>button]:!rounded-none" title={uiText("syncSettings_1cbb")}>
        <div className="max-w-[740px] px-3 pb-3">
          <div className="divide-y divide-border">
            <div className="py-3">
              <GitRepositoryForm
                draft={draft}
                adding={false}
                disabled={disabled}
                saving={saving}
                onChange={updateDraft}
              />
            </div>
            <section className="space-y-3 py-3">
              <h4 className="text-[15px] font-semibold leading-[22px]">{uiText("repositoryDetails_22cd")}</h4>
              <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">{uiText("branch_bfc0")}</dt>
                <dd className="break-words">{config.branch}</dd>
                <dt className="text-muted-foreground">{uiText("sshUrl_4436")}</dt>
                <dd className="break-all font-mono text-sm">
                  {config.remoteUrl}
                </dd>
              </dl>
            </section>
            <div className="pt-3">
              <div className="flex justify-end">
                <Button
                  className="text-danger"
                  variant="ghost"
                  disabled={actionDisabled}
                  onClick={() => setRemoveConfirmation(config.id)}
                >
                  {uiText("removeSyncConfiguration_dcd6")}</Button>
              </div>
              {removeConfirmation === config.id && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm">
                    {uiText("removeThisSyncConfigurationLocalAnd_4136")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={actionDisabled}
                      onClick={onRemove}
                    >
                      {uiText("remove_e2cf")}</Button>
                    <Button
                      variant="outline"
                      disabled={disabled}
                      onClick={() => setRemoveConfirmation("")}
                    >
                      {uiText("cancel_625f")}</Button>
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
