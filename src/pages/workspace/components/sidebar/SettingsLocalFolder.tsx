import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SettingsLocalFolder.tsx#localMessages:1">`
zh-Hans:
  localFolders_497e: "本地文件夹"
  openWith_14ae: "打开方式"
  fileManager_7d1d: "文件管理器"
  eGPathFinder_d4e9: "如：Path Finder"
  editor_5373: "编辑器"
  default_18c6: "默认"
  eGCursorZedCodeR_de88: "如：Cursor、Zed、code -r"
  terminal_4722: "终端"
  eGGhosttyItermWezterm_1db3: "如：Ghostty、iTerm、wezterm"
  storageMaintenance_aa18: "存储维护"
  cleanUpUnusedAttachments_4503: "清理未使用的附件"
  afterConfirmationUnusedImagesAudioAnd_e2b6: "确认后将未引用的图片、音视频移入废纸篓。"
  openCleanup_9813: "打开清理"
en:
  localFolders_497e: "Local folders"
  openWith_14ae: "Open with"
  fileManager_7d1d: "File manager"
  eGPathFinder_d4e9: "e.g. Path Finder"
  editor_5373: "Editor"
  default_18c6: "Default"
  eGCursorZedCodeR_de88: "e.g. Cursor, Zed, code -r"
  terminal_4722: "Terminal"
  eGGhosttyItermWezterm_1db3: "e.g. Ghostty, iTerm, wezterm"
  storageMaintenance_aa18: "Storage maintenance"
  cleanUpUnusedAttachments_4503: "Clean up unused attachments"
  afterConfirmationUnusedImagesAudioAnd_e2b6: "After confirmation, unused images, audio, and video will be moved to the system trash."
  openCleanup_9813: "Open cleanup"
ja:
  localFolders_497e: "ローカルフォルダ"
  openWith_14ae: "開き方"
  fileManager_7d1d: "ファイルマネージャ"
  eGPathFinder_d4e9: "例：Path Finder"
  editor_5373: "エディタ"
  default_18c6: "デフォルト"
  eGCursorZedCodeR_de88: "例：Cursor、Zed、code -r"
  terminal_4722: "ターミナル"
  eGGhosttyItermWezterm_1db3: "例：Ghostty、iTerm、wezterm"
  storageMaintenance_aa18: "ストレージのメンテナンス"
  cleanUpUnusedAttachments_4503: "未使用の添付ファイルを整理"
  afterConfirmationUnusedImagesAudioAnd_e2b6: "確認後、参照されていない画像、音声、動画をゴミ箱に移動します。"
  openCleanup_9813: "整理を開く"
`;
const uiText = createTranslator(localMessages);
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { SettingsSectionCard } from "./settings/SettingsSectionCard";
import {
  type SettingsLocalFolderProps,
  SETTINGS_OPTION_ROW_CLASS,
  SYSTEM_FILE_MANAGER_IDS,
  SYSTEM_TERMINAL_IDS,
  OpenAppField,
  HiddenFoldersField,
  LegacyInternalPagesExportCard,
} from "./local-folder-settings/shared";
import { useLocalFolderSettings } from "./local-folder-settings/useLocalFolderSettings";

export function SettingsLocalFolder(props: SettingsLocalFolderProps) {
  useLocale();
  const localFolderSettingsContext = useLocalFolderSettings(props);
  const context = localFolderSettingsContext;
  const {
    localFolderFileManager,
    setLocalFolderFileManager,
    localFolderExternalEditor,
    setLocalFolderExternalEditor,
    localFolderTerminal,
    setLocalFolderTerminal,
    localFolderHiddenFolders,
    fileManagerOptions,
    editorOptions,
    terminalOptions,
    systemDefaultLabels,
    openAssetMaintenance,
    handleHiddenFoldersChange,
  } = context;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold tracking-tight text-foreground">
        {uiText("localFolders_497e")}</h3>

      <div className="settings-card-columns">
        <div className="space-y-5">
          <LegacyInternalPagesExportCard />

          <SettingsSectionCard title={uiText("openWith_14ae")}>
            <div className="space-y-3">
              <OpenAppField
                id="local-folder-file-manager"
                title={uiText("fileManager_7d1d")}
                icon={GooseIcons.FolderOpen}
                value={localFolderFileManager}
                onChange={setLocalFolderFileManager}
                defaultLabel={systemDefaultLabels.fileManager}
                customPlaceholder={uiText("eGPathFinder_d4e9")}
                options={fileManagerOptions}
                systemIds={SYSTEM_FILE_MANAGER_IDS}
              />
              <OpenAppField
                id="local-folder-editor"
                title={uiText("editor_5373")}
                icon={GooseIcons.SquarePen}
                value={localFolderExternalEditor}
                onChange={setLocalFolderExternalEditor}
                defaultLabel={uiText("default_18c6")}
                customPlaceholder={uiText("eGCursorZedCodeR_de88")}
                options={editorOptions}
              />
              <OpenAppField
                id="local-folder-terminal"
                title={uiText("terminal_4722")}
                icon={GooseIcons.Terminal}
                value={localFolderTerminal}
                onChange={setLocalFolderTerminal}
                defaultLabel={systemDefaultLabels.terminal}
                customPlaceholder={uiText("eGGhosttyItermWezterm_1db3")}
                options={terminalOptions}
                systemIds={SYSTEM_TERMINAL_IDS}
              />
            </div>
          </SettingsSectionCard>
        </div>
        <div className="space-y-5">
          <HiddenFoldersField
            folders={localFolderHiddenFolders}
            onChange={handleHiddenFoldersChange}
          />

          <SettingsSectionCard title={uiText("storageMaintenance_aa18")}>
            <div
              className={`settings-local-folder-pick-row flex items-center justify-between gap-3 ${SETTINGS_OPTION_ROW_CLASS} goose-settings-option-row--stack`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <GooseIcons.Trash2
                    className="h-4 w-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <Label>{uiText("cleanUpUnusedAttachments_4503")}</Label>
                </div>
                <p className="mt-1 pl-7 text-sm leading-relaxed text-muted-foreground">
                  {uiText("afterConfirmationUnusedImagesAudioAnd_e2b6")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => void openAssetMaintenance()}
              >
                {uiText("openCleanup_9813")}</Button>
            </div>
          </SettingsSectionCard>
        </div>
      </div>
    </div>
  );
}
