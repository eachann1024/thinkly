import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/useWebdavConfiguration.tsx#localMessages:1">`
zh-Hans:
  couldNotLoadRemoteBackups_f7ce: "加载远端列表失败"
  saveFailed_6de9: "保存失败"
  invalidServerUrl_dedc: "服务地址格式不正确"
  invalidRemoteFolder_5a1d: "远端目录格式不正确"
  configurationSavedAndConnectionVerified_c7f1: "配置已保存，连接测试成功"
  connectionCheckFailed_f917: "连接测试失败"
  operationFailed_5fa8: "操作失败"
en:
  couldNotLoadRemoteBackups_f7ce: "Could not load remote backups"
  saveFailed_6de9: "Save failed"
  invalidServerUrl_dedc: "Invalid server URL"
  invalidRemoteFolder_5a1d: "Invalid remote folder"
  configurationSavedAndConnectionVerified_c7f1: "Configuration saved and connection verified"
  connectionCheckFailed_f917: "Connection check failed"
  operationFailed_5fa8: "Operation failed"
ja:
  couldNotLoadRemoteBackups_f7ce: "リモート一覧を読み込めませんでした"
  saveFailed_6de9: "保存に失敗しました"
  invalidServerUrl_dedc: "サーバー URL の形式が正しくありません"
  invalidRemoteFolder_5a1d: "リモートフォルダの形式が正しくありません"
  configurationSavedAndConnectionVerified_c7f1: "設定を保存し、接続テストに成功しました"
  connectionCheckFailed_f917: "接続テストに失敗しました"
  operationFailed_5fa8: "操作に失敗しました"
`;
const uiText = createTranslator(localMessages);
import {
  testWebdavConnection,
  listWebdavBackups,
  normalizeBaseUrl,
  normalizeRemoteDir,
} from "@/lib/webdavSync";
import { toast } from "@/components/ui/sonner";
import type { useDataPanelState } from "./useDataPanelState";

export function useWebdavConfiguration(
  input: ReturnType<typeof useDataPanelState>,
) {
  useLocale();
  const {
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavRemoteDir,
    updateWebdavSettings,
    tempUrl,
    setTempUrl,
    tempUsername,
    tempPassword,
    setTempPassword,
    tempRemoteDir,
    setTempRemoteDir,
    tempRetentionDays,
    setTempRetentionDays,
    tempAutoBackupEnabled,
    isRemoteListOpen,
    hasSavedConfig,
    activationRef,
    isCurrentActivation,
    nextListId,
    sendWebdavEvent,
    beginWebdavOperation,
  } = input;

  const readRemoteList = async (
    mode: "standalone" | "nested" = "nested",
    config = {
      url: webdavUrl,
      username: webdavUsername,
      password: webdavPassword,
      dir: webdavRemoteDir,
    },
  ) => {
    const id = ++nextListId.current;
    const epoch = activationRef.current.epoch;
    sendWebdavEvent({ type: "list.started", id, mode });
    try {
      const files = await listWebdavBackups(
        config.url,
        config.username,
        config.password,
        config.dir,
      );
      if (isCurrentActivation(epoch))
        sendWebdavEvent({ type: "list.loaded", id, files });
      return files;
    } catch (error) {
      if (isCurrentActivation(epoch))
        sendWebdavEvent({ type: "list.failed", id });
      throw error;
    }
  };

  const fetchRemoteList = async () => {
    if (!hasSavedConfig || !activationRef.current.active) return;
    try {
      await readRemoteList("standalone");
    } catch (err) {
      console.error(err);
      toast.error(uiText("couldNotLoadRemoteBackups_f7ce"));
    }
  };

  const handleSaveAndTest = async () => {
    if (!activationRef.current.active) return;
    const id = beginWebdavOperation("testing");
    if (id === null) return;
    const epoch = activationRef.current.epoch;
    const pwdToUse = tempPassword || webdavPassword;
    try {
      let cleanUrl: string;
      let cleanDir: string;
      try {
        cleanUrl = normalizeBaseUrl(tempUrl);
      } catch (err: any) {
        toast.error(uiText("saveFailed_6de9"), {
          description: err.message || uiText("invalidServerUrl_dedc"),
        });
        return;
      }
      try {
        cleanDir = normalizeRemoteDir(tempRemoteDir);
      } catch (err: any) {
        toast.error(uiText("saveFailed_6de9"), {
          description: err.message || uiText("invalidRemoteFolder_5a1d"),
        });
        return;
      }
      let cleanDays = tempRetentionDays;
      if (!Number.isInteger(cleanDays) || cleanDays < 1 || cleanDays > 365) {
        cleanDays = Math.max(1, Math.min(365, cleanDays || 365));
      }
      setTempUrl(cleanUrl);
      setTempRemoteDir(cleanDir);
      setTempRetentionDays(cleanDays);
      const result = await testWebdavConnection(
        cleanUrl,
        tempUsername,
        pwdToUse,
        cleanDir,
      );
      if (result.ok) {
        updateWebdavSettings({
          webdavUrl: cleanUrl,
          webdavUsername: tempUsername,
          webdavPassword: pwdToUse,
          webdavRemoteDir: cleanDir,
          webdavRetentionDays: cleanDays,
          webdavAutoBackupEnabled: tempAutoBackupEnabled,
        });
        setTempPassword("");
        toast.success(uiText("configurationSavedAndConnectionVerified_c7f1"));
        if (isRemoteListOpen && isCurrentActivation(epoch)) {
          await readRemoteList("nested", {
            url: cleanUrl,
            username: tempUsername,
            password: pwdToUse,
            dir: cleanDir,
          });
        }
      } else {
        toast.error(uiText("connectionCheckFailed_f917"), { description: result.message });
      }
    } catch (err: any) {
      toast.error(uiText("operationFailed_5fa8"), { description: err.message || String(err) });
    } finally {
      sendWebdavEvent({ type: "operation.finished", id });
    }
  };
  return { ...input, readRemoteList, fetchRemoteList, handleSaveAndTest };
}
