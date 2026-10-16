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

  // 列表是独立请求区域；操作内部刷新不再次获取前台操作锁。
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
      toast.error("加载远端列表失败");
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
        toast.error("保存失败", {
          description: err.message || "服务地址格式不正确",
        });
        return;
      }
      try {
        cleanDir = normalizeRemoteDir(tempRemoteDir);
      } catch (err: any) {
        toast.error("保存失败", {
          description: err.message || "远端目录格式不正确",
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
        toast.success("配置已保存，连接测试成功");
        if (isRemoteListOpen && isCurrentActivation(epoch)) {
          await readRemoteList("nested", {
            url: cleanUrl,
            username: tempUsername,
            password: pwdToUse,
            dir: cleanDir,
          });
        }
      } else {
        toast.error("连接测试失败", { description: result.message });
      }
    } catch (err: any) {
      toast.error("操作失败", { description: err.message || String(err) });
    } finally {
      sendWebdavEvent({ type: "operation.finished", id });
    }
  };
  return { ...input, readRemoteList, fetchRemoteList, handleSaveAndTest };
}
