import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/SettingsDataPanel.tsx#localMessages:1">`
zh-Hans:
  dataManagement_2d71: "数据管理"
  gettingStarted_9a32: "新手引导"
  restartSetupGuide_8ab0: "重新开始引导"
en:
  dataManagement_2d71: "Data management"
  gettingStarted_9a32: "Getting started"
  restartSetupGuide_8ab0: "Restart setup guide"
ja:
  dataManagement_2d71: "データ管理"
  gettingStarted_9a32: "はじめに"
  restartSetupGuide_8ab0: "ガイドを最初からやり直す"
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

export function SettingsDataPanel(props: SettingsDataPanelProps) {
  useLocale();
  const data = useDataPanelState(props);
  const configuration = useWebdavConfiguration(data);
  const sync = useWebdavSyncActions(configuration);
  const webdavRemoteActionsContext = useWebdavRemoteActions(sync);
  const context = webdavRemoteActionsContext;
  const {
    active,
    onRestartGuide,
  } = context;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {uiText("dataManagement_2d71")}</h3>

      <SettingsSectionCard
        title={uiText("gettingStarted_9a32")}
        actions={
          <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
