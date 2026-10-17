import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsDataPanel.tsx#localMessages:1">`
zh-Hans:
  dataManagement_2d71: "数据管理"
  gettingStarted_9a32: "新手引导"
  replayAnimation_b9c4: "重播动画"
  restartSetupGuide_8ab0: "重新开始引导"
  cancel_625f: "取消"
  confirm_38cf: "确定"
en:
  dataManagement_2d71: "Data management"
  gettingStarted_9a32: "Getting started"
  replayAnimation_b9c4: "Replay animation"
  restartSetupGuide_8ab0: "Restart setup guide"
  cancel_625f: "Cancel"
  confirm_38cf: "Confirm"
`;
const uiText = createTranslator(localMessages);
import { renderWebdavRemoteBackups } from "./data-panel/renderWebdavRemoteBackups";
import { renderWebdavConfiguration } from "./data-panel/renderWebdavConfiguration";
import { renderDataImportExport } from "./data-panel/renderDataImportExport";
import { SettingsSectionCard } from "./SettingsSectionCard";
import { type SettingsDataPanelProps } from "./data-panel/shared";
import { useDataPanelState } from "./data-panel/useDataPanelState";
import { useWebdavConfiguration } from "./data-panel/useWebdavConfiguration";
import { useWebdavSyncActions } from "./data-panel/useWebdavSyncActions";
import { useWebdavRemoteActions } from "./data-panel/useWebdavRemoteActions";
import { useIntroVideo } from "@/stores/introVideo";

export function SettingsDataPanel(props: SettingsDataPanelProps) {
  useLocale();
  const replayIntro = useIntroVideo((state) => state.show);
  const data = useDataPanelState(props);
  const configuration = useWebdavConfiguration(data);
  const sync = useWebdavSyncActions(configuration);
  const webdavRemoteActionsContext = useWebdavRemoteActions(sync);
  const context = webdavRemoteActionsContext;
  const {
    active,
    onRestartGuide,
    confirmConfig,
    cancelConfirmation,
    confirmRemoteAction,
  } = context;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {uiText("dataManagement_2d71")}</h3>

      <SettingsSectionCard
        title={uiText("gettingStarted_9a32")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={replayIntro}>
              {uiText("replayAnimation_b9c4")}</Button>
            <Button variant="outline" onClick={onRestartGuide}>
              {uiText("restartSetupGuide_8ab0")}</Button>
          </div>
        }
      />

      <div className="settings-data-grid">
        {renderDataImportExport(context)}

        <div className="space-y-4">
          {renderWebdavConfiguration(context)}

          {renderWebdavRemoteBackups(context)}
        </div>
      </div>

      <DialogShell
        open={active && Boolean(confirmConfig)}
        onOpenChange={(open) => {
          if (!open) {
            cancelConfirmation();
          }
        }}
        title={confirmConfig?.title}
      >
        <div className="px-6 pb-6 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground break-all">
            {confirmConfig?.description}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-[var(--goose-control-radius)]"
              onClick={() => {
                cancelConfirmation();
              }}
            >
              {uiText("cancel_625f")}</Button>
            <Button
              variant="destructive"
              className="rounded-[var(--goose-control-radius)]"
              onClick={() => void confirmRemoteAction()}
            >
              {uiText("confirm_38cf")}</Button>
          </div>
        </div>
      </DialogShell>
    </div>
  );
}
