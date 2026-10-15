import { BrowserWindow, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { lookupWindowContext } from "../windows";

export async function flushBeforeUpdate(): Promise<void> {
  await Promise.all(BrowserWindow.getAllWindows().filter((win) => lookupWindowContext(win)).map((win) =>
    new Promise<void>((resolve, reject) => {
      const requestId = randomUUID();
      const finish = (error?: string) => {
        clearTimeout(timer);
        ipcMain.removeListener("desktop:before-update-reply", reply);
        win.removeListener("closed", closed);
        if (error) reject(new Error(error)); else resolve();
      };
      const reply = (event: Electron.IpcMainEvent, id: string, error: string | null) => {
        if (id === requestId && event.sender === win.webContents) finish(error || undefined);
      };
      const closed = () => finish("窗口已关闭，请重新尝试更新");
      const timer = setTimeout(() => finish("保存笔记超时，请保存后重新尝试更新"), 30_000);
      ipcMain.on("desktop:before-update-reply", reply);
      win.once("closed", closed);
      win.webContents.send("desktop:before-update", requestId);
    })));
}
