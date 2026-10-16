import { generateExportZip } from "@/lib/export";
import { uploadWebdavBackup } from "@/lib/webdavSync";
import { toast } from "@/components/ui/sonner";
import type { useWebdavConfiguration } from "./useWebdavConfiguration";

export function useWebdavSyncActions(
  input: ReturnType<typeof useWebdavConfiguration>,
) {
  const {
    notebookList,
    notebooks,
    pages,
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavRemoteDir,
    webdavRetentionDays,
    updateWebdavSettings,
    isRemoteListOpen,
    setIsRemoteListOpen,
    activationRef,
    isCurrentActivation,
    hasSavedConfig,
    fetchRemoteList,
    readRemoteList,
    beginWebdavOperation,
    sendWebdavEvent,
  } = input;

  const handleUploadNow = async () => {
    if (!activationRef.current.active) return;
    const id = beginWebdavOperation("uploading");
    if (id === null) return;
    const epoch = activationRef.current.epoch;
    try {
      const notebookIds = notebookList.map((n) => n.id);
      if (notebookIds.length === 0) {
        toast.error("无可导出的笔记本数据");
        return;
      }
      const zipBlob = await generateExportZip(
        { format: "md", notebookIds },
        notebooks,
        Object.values(pages),
      );
      if (!isCurrentActivation(epoch)) return;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const fileName = `goose-note-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.zip`;
      const result = await uploadWebdavBackup(
        webdavUrl,
        webdavUsername,
        webdavPassword,
        webdavRemoteDir,
        webdavRetentionDays,
        zipBlob,
        fileName,
      );
      if (result.success) {
        updateWebdavSettings({
          webdavLastUploadAt: now.toISOString(),
          webdavLastUploadFilename: fileName,
        });
        toast.success("同步备份成功", {
          description: `已清理 ${result.cleanedCount} 个云端过期备份`,
        });
        if (isRemoteListOpen && isCurrentActivation(epoch))
          await readRemoteList();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("备份上传失败", { description: err.message || String(err) });
    } finally {
      sendWebdavEvent({ type: "operation.finished", id });
    }
  };

  const handleSyncLatest = async () => {
    if (!activationRef.current.active) return;
    const id = beginWebdavOperation("findingLatest");
    if (id === null) return;
    const epoch = activationRef.current.epoch;
    let awaitingConfirmation = false;
    try {
      const list = await readRemoteList();
      if (!isCurrentActivation(epoch)) return;
      if (list.length === 0) {
        toast.error("云端未发现可用的备份文件");
        return;
      }
      sendWebdavEvent({
        type: "confirmation.requested",
        id,
        action: "latest",
        file: list[0],
        epoch,
        connection: {
          url: webdavUrl,
          username: webdavUsername,
          password: webdavPassword,
          dir: webdavRemoteDir,
        },
      });
      awaitingConfirmation = true;
    } catch (err: any) {
      if (!isCurrentActivation(epoch)) return;
      console.error(err);
      toast.error("同步失败", { description: err.message || String(err) });
    } finally {
      if (!awaitingConfirmation)
        sendWebdavEvent({ type: "operation.finished", id });
    }
  };

  const toggleRemoteList = () => {
    const next = !isRemoteListOpen;
    setIsRemoteListOpen(next);
    if (next && hasSavedConfig) void fetchRemoteList();
  };
  return { ...input, handleUploadNow, handleSyncLatest, toggleRemoteList };
}
