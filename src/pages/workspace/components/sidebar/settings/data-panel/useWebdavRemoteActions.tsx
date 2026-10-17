import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/data-panel/useWebdavRemoteActions.tsx#localMessages:1">`
zh-Hans:
  cloudBackupDeleted_5e7b: "云端备份已删除"
  couldNotDeleteBackup_31a4: "删除备份失败"
  syncFailed_d610: "同步失败"
  couldNotRestoreBackup_f06d: "恢复备份失败"
  deleteCloudBackup_6352: "删除云端备份"
  restoreFromCloud_6e37: "从云端恢复"
  restoreCloudBackup_bfc3: "恢复云端备份"
  confirmDeleteBackup: "确定删除云端备份「{{name}}」？删除后无法从云端找回。"
  confirmRestoreLatest: "确定从云端恢复最新备份「{{name}}」？此操作将覆盖本地当前数据。恢复前将先校验完整性；若恢复中断，将自动还原当前本地数据。"
  confirmRestoreBackup: "确定使用云端备份「{{name}}」恢复数据？恢复前将先校验完整性；若恢复中断，将自动还原当前本地数据。"
en:
  cloudBackupDeleted_5e7b: "Cloud backup deleted"
  couldNotDeleteBackup_31a4: "Could not delete backup"
  syncFailed_d610: "Sync failed"
  couldNotRestoreBackup_f06d: "Could not restore backup"
  deleteCloudBackup_6352: "Delete cloud backup"
  restoreFromCloud_6e37: "Restore from cloud"
  restoreCloudBackup_bfc3: "Restore cloud backup"
  confirmDeleteBackup: "Delete cloud backup “{{name}}”? It cannot be recovered from the cloud."
  confirmRestoreLatest: "Restore the latest cloud backup “{{name}}”? This replaces current local data. The backup will be checked first; if restoration is interrupted, your current local data will be restored automatically."
  confirmRestoreBackup: "Restore cloud backup “{{name}}”? The backup will be checked first; if restoration is interrupted, your current local data will be restored automatically."
`;
const uiText = createTranslator(localMessages);
import {
  downloadWebdavBackup,
  deleteWebdavBackup,
  type WebdavBackupFile,
} from "@/lib/webdavSync";
import { toast } from "@/components/ui/sonner";
import type { useWebdavSyncActions } from "./useWebdavSyncActions";

export function useWebdavRemoteActions(
  input: ReturnType<typeof useWebdavSyncActions>,
) {
  useLocale();
  const {
    onResetAndImport,
    webdavUrl,
    webdavUsername,
    webdavPassword,
    webdavRemoteDir,
    updateWebdavSettings,
    showAllRemote,
    remoteFiles,
    activationRef,
    isCurrentActivation,
    operationStateRef,
    nextOperationId,
    sendWebdavEvent,
    readRemoteList,
    confirmation,
  } = input;

  const requestConfirmation = (
    action: "restore" | "delete",
    file: WebdavBackupFile,
  ) => {
    const current = operationStateRef.current;
    if (
      !activationRef.current.active ||
      current.operation.status !== "idle" ||
      current.list.status === "loading"
    )
      return;
    sendWebdavEvent({
      type: "confirmation.requested",
      action,
      file,
      id: ++nextOperationId.current,
      epoch: activationRef.current.epoch,
      connection: {
        url: webdavUrl,
        username: webdavUsername,
        password: webdavPassword,
        dir: webdavRemoteDir,
      },
    });
  };
  const handleRestore = (file: WebdavBackupFile) =>
    requestConfirmation("restore", file);
  const handleDelete = (file: WebdavBackupFile) =>
    requestConfirmation("delete", file);
  const cancelConfirmation = () =>
    sendWebdavEvent({ type: "confirmation.cancelled" });

  const confirmRemoteAction = async () => {
    const pending = operationStateRef.current.operation;
    if (pending.status !== "confirming" || !isCurrentActivation(pending.epoch))
      return;
    // 同步推进后再触发副作用，同一 tick 的第二次确认直接退出。
    sendWebdavEvent({ type: "confirmation.accepted", id: pending.id });
    const { action, file, epoch, id, connection } = pending;
    try {
      if (action === "delete") {
        await deleteWebdavBackup(
          connection.url,
          connection.username,
          connection.password,
          connection.dir,
          file.basename,
        );
        toast.success(uiText("cloudBackupDeleted_5e7b"));
        if (isCurrentActivation(epoch))
          await readRemoteList("nested", connection);
      } else {
        const blob = await downloadWebdavBackup(
          connection.url,
          connection.username,
          connection.password,
          connection.dir,
          file.basename,
        );
        if (!isCurrentActivation(epoch)) return;
        if (onResetAndImport) {
          await onResetAndImport(blob);
          updateWebdavSettings({
            webdavLastDownloadAt: new Date().toISOString(),
            webdavLastDownloadFilename: file.basename,
          });
        }
      }
    } catch (err: any) {
      if (action === "latest" && !isCurrentActivation(epoch)) return;
      console.error(err);
      toast.error(
        action === "delete"
          ? uiText("couldNotDeleteBackup_31a4")
          : action === "latest"
            ? uiText("syncFailed_d610")
            : uiText("couldNotRestoreBackup_f06d"),
        { description: err.message || String(err) },
      );
    } finally {
      sendWebdavEvent({ type: "operation.finished", id });
    }
  };

  const confirmConfig = confirmation
    ? {
        title:
          confirmation.action === "delete"
            ? uiText("deleteCloudBackup_6352")
            : confirmation.action === "latest"
              ? uiText("restoreFromCloud_6e37")
              : uiText("restoreCloudBackup_bfc3"),
        description:
          confirmation.action === "delete"
            ? uiText("confirmDeleteBackup", { name: confirmation.file.basename })
            : confirmation.action === "latest"
              ? uiText("confirmRestoreLatest", { name: confirmation.file.basename })
              : uiText("confirmRestoreBackup", { name: confirmation.file.basename }),
      }
    : null;
  const visibleRemoteFiles = showAllRemote
    ? remoteFiles
    : remoteFiles.slice(0, 3);
  return {
    ...input,
    handleRestore,
    handleDelete,
    visibleRemoteFiles,
    confirmConfig,
    cancelConfirmation,
    confirmRemoteAction,
  };
}
