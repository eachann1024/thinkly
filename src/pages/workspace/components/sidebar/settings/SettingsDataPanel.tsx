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
        数据管理
      </h3>

      <SettingsSectionCard
        title="新手引导"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={replayIntro}>
              重播动画
            </Button>
            <Button variant="outline" onClick={onRestartGuide}>
              重新开始引导
            </Button>
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
              取消
            </Button>
            <Button
              variant="destructive"
              className="rounded-[var(--goose-control-radius)]"
              onClick={() => void confirmRemoteAction()}
            >
              确定
            </Button>
          </div>
        </div>
      </DialogShell>
    </div>
  );
}
