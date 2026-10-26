import { ipcMain, type BrowserWindow } from "electron";
import { t } from "./i18n/gitSyncMessages";
import { gitSyncPreparationFailure } from "../../src/lib/git-sync-preparation";

const pendingReplies = new Map<
  string,
  { senderId: number; finish: (error: string | null) => void }
>();

export function prepareGitSyncWindow(
  win: BrowserWindow,
  roots: string[],
  requestId: string,
) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(t("saveTimeout")), 120_000);
    const finish = (error: string | null) => {
      clearTimeout(timeout);
      pendingReplies.delete(requestId);
      win.webContents.removeListener("destroyed", destroyed);
      if (error) reject(new Error(error));
      else resolve();
    };
    const destroyed = () => finish(t("windowClosed"));
    win.webContents.once("destroyed", destroyed);
    pendingReplies.set(requestId, { senderId: win.webContents.id, finish });
    try {
      win.webContents.send("git-sync:prepare", requestId, roots);
    } catch {
      finish(t("windowClosed"));
    }
  });
}

export function registerGitSyncPrepareReply() {
  ipcMain.on(
    "git-sync:prepare-reply",
    (event, requestId: string, error: string | null) => {
      if (typeof requestId !== "string") return;
      const pending = pendingReplies.get(requestId);
      if (
        !pending ||
        event.sender.id !== pending.senderId ||
        event.senderFrame !== event.sender.mainFrame
      )
        return;
      pending.finish(error === null ? null : gitSyncPreparationFailure(error));
    },
  );
}
