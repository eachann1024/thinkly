import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/useWebdavSyncActions.tsx#localMessages:1">`
zh-Hans:
  noNotebookDataToExport_03e2: "无可导出的笔记本数据"
  backupSynced_dea7: "同步备份成功"
  backupsCleaned: "已清理 {{count}} 个云端过期备份"
  couldNotUploadBackup_7240: "备份上传失败"
  noUsableBackupsFoundInThe_3663: "云端未发现可用的备份文件"
  syncFailed_d610: "同步失败"
en:
  noNotebookDataToExport_03e2: "No notebook data to export"
  backupSynced_dea7: "Backup synced"
  backupsCleaned: "Expired cloud backups removed: {{count}}"
  couldNotUploadBackup_7240: "Could not upload backup"
  noUsableBackupsFoundInThe_3663: "No usable backups found in the cloud"
  syncFailed_d610: "Sync failed"
ja:
  noNotebookDataToExport_03e2: "エクスポートできるノートブックデータがありません"
  backupSynced_dea7: "バックアップを同期しました"
  backupsCleaned: "期限切れのクラウドバックアップを {{count}} 件削除しました"
  couldNotUploadBackup_7240: "バックアップをアップロードできませんでした"
  noUsableBackupsFoundInThe_3663: "クラウドに使用可能なバックアップファイルが見つかりません"
  syncFailed_d610: "同期に失敗しました"
`;
const uiText = createTranslator(localMessages);
import { generateExportZip } from "@/lib/export";
import { uploadWebdavBackup } from "@/lib/webdavSync";
import { toast } from "@/components/ui/sonner";
import type { useWebdavConfiguration } from "./useWebdavConfiguration";

export function useWebdavSyncActions(
  input: ReturnType<typeof useWebdavConfiguration>,
) {
  useLocale();
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
        toast.error(uiText("noNotebookDataToExport_03e2"));
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
        toast.success(uiText("backupSynced_dea7"), {
          description: uiText("backupsCleaned", { count: result.cleanedCount }),
        });
        if (isRemoteListOpen && isCurrentActivation(epoch))
          await readRemoteList();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(uiText("couldNotUploadBackup_7240"), { description: err.message || String(err) });
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
        toast.error(uiText("noUsableBackupsFoundInThe_3663"));
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
      toast.error(uiText("syncFailed_d610"), { description: err.message || String(err) });
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
