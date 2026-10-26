import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/useDataPanelState.tsx#localMessages:1">`
zh-Hans:
  notSyncedYet_e1d9: "尚未同步"
en:
  notSyncedYet_e1d9: "Not synced yet"
ja:
  notSyncedYet_e1d9: "未同期"
`;
const uiText = createTranslator(localMessages);
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSettings } from "@/stores/settings";
import { useWebdavOperationState } from "./useWebdavOperationState";
import { type SettingsDataPanelProps, formatRemoteTime } from "./shared";

export function useDataPanelState({
  active,
  importing,
  onImport,
  selectedIds,
  notebookList,
  onToggleNotebook,
  onSelectAll,
  format,
  onFormatChange,
  exporting,
  onExport,
  onOpenResetDialog,
  onRestartGuide,
  onResetAndImport,
}: SettingsDataPanelProps) {
  const locale = useLocale();
  const selectedCount = selectedIds.length;

  const totalCount = notebookList.length;

  const {
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavRemoteDir,
    webdavRetentionDays,
    webdavAutoBackupEnabled,
    webdavLastUploadAt,
    webdavLastUploadFilename,
    webdavLastDownloadAt,
    webdavLastDownloadFilename,
    updateWebdavSettings,
  } = useSettings(useShallow((state) => ({
    webdavUrl: state.webdavUrl,
    webdavUsername: state.webdavUsername,
    webdavPassword: state.webdavPassword,
    webdavRemoteDir: state.webdavRemoteDir,
    webdavRetentionDays: state.webdavRetentionDays,
    webdavAutoBackupEnabled: state.webdavAutoBackupEnabled,
    webdavLastUploadAt: state.webdavLastUploadAt,
    webdavLastUploadFilename: state.webdavLastUploadFilename,
    webdavLastDownloadAt: state.webdavLastDownloadAt,
    webdavLastDownloadFilename: state.webdavLastDownloadFilename,
    updateWebdavSettings: state.updateWebdavSettings,
  })));

  const [tempUrl, setTempUrl] = useState(webdavUrl);

  const [tempUsername, setTempUsername] = useState(webdavUsername);

  const [tempPassword, setTempPassword] = useState("");

  const [tempRemoteDir, setTempRemoteDir] = useState(webdavRemoteDir);

  const [tempRetentionDays, setTempRetentionDays] =
    useState(webdavRetentionDays);

  const [tempAutoBackupEnabled, setTempAutoBackupEnabled] = useState(
    webdavAutoBackupEnabled,
  );

  const operationState = useWebdavOperationState();
  const { sendWebdavEvent } = operationState;
  const [isRemoteListOpen, setIsRemoteListOpen] = useState(false);
  const [showAllRemote, setShowAllRemote] = useState(false);

  const activationRef = useRef({ active, epoch: 0 });

  useLayoutEffect(() => {
    const activation = activationRef.current;
    activation.active = active;
    activation.epoch += 1;
    if (!active) {
      sendWebdavEvent({ type: "panel.deactivated" });
    }
    return () => {
      activation.active = false;
      activation.epoch += 1;
    };
  }, [active, sendWebdavEvent]);

  const isCurrentActivation = (epoch: number) =>
    activationRef.current.active && activationRef.current.epoch === epoch;

  useEffect(() => {
    setTempUrl(webdavUrl);
    setTempUsername(webdavUsername);
    setTempRemoteDir(webdavRemoteDir);
    setTempRetentionDays(webdavRetentionDays);
    setTempAutoBackupEnabled(webdavAutoBackupEnabled);
  }, [
    webdavUrl,
    webdavUsername,
    webdavRemoteDir,
    webdavRetentionDays,
    webdavAutoBackupEnabled,
  ]);

  const hasSavedConfig = Boolean(webdavUrl && webdavUsername && webdavPassword);

  const lastUploadText = useMemo(() => {
    const time = formatRemoteTime(webdavLastUploadAt);
    return webdavLastUploadFilename
      ? `${time} (${webdavLastUploadFilename})`
      : uiText("notSyncedYet_e1d9");
  }, [webdavLastUploadAt, webdavLastUploadFilename, locale]);

  const lastDownloadText = useMemo(() => {
    const time = formatRemoteTime(webdavLastDownloadAt);
    return webdavLastDownloadFilename
      ? `${time} (${webdavLastDownloadFilename})`
      : uiText("notSyncedYet_e1d9");
  }, [webdavLastDownloadAt, webdavLastDownloadFilename, locale]);
  return {
    active,
    importing,
    onImport,
    selectedIds,
    notebookList,
    onToggleNotebook,
    onSelectAll,
    format,
    onFormatChange,
    exporting,
    onExport,
    onOpenResetDialog,
    onRestartGuide,
    onResetAndImport,
    selectedCount,
    totalCount,
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavRemoteDir,
    webdavRetentionDays,
    webdavAutoBackupEnabled,
    webdavLastUploadAt,
    webdavLastUploadFilename,
    webdavLastDownloadAt,
    webdavLastDownloadFilename,
    updateWebdavSettings,
    tempUrl,
    setTempUrl,
    tempUsername,
    setTempUsername,
    tempPassword,
    setTempPassword,
    tempRemoteDir,
    setTempRemoteDir,
    tempRetentionDays,
    setTempRetentionDays,
    tempAutoBackupEnabled,
    setTempAutoBackupEnabled,
    ...operationState,
    isRemoteListOpen,
    setIsRemoteListOpen,
    showAllRemote,
    setShowAllRemote,
    activationRef,
    isCurrentActivation,
    hasSavedConfig,
    lastUploadText,
    lastDownloadText,
  };
}
