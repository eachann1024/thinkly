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
        toast.success("云端备份已删除");
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
          ? "删除备份失败"
          : action === "latest"
            ? "同步失败"
            : "恢复备份失败",
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
            ? "删除云端备份"
            : confirmation.action === "latest"
              ? "从云端恢复"
              : "恢复云端备份",
        description:
          confirmation.action === "delete"
            ? `确定删除云端备份「${confirmation.file.basename}」？删除后无法从云端找回。`
            : confirmation.action === "latest"
              ? `确定从云端恢复最新备份「${confirmation.file.basename}」？此操作将覆盖本地当前数据。恢复前将先校验完整性；若恢复中断，将自动还原当前本地数据。`
              : `确定使用云端备份「${confirmation.file.basename}」恢复数据？恢复前将先校验完整性；若恢复中断，将自动还原当前本地数据。`,
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
