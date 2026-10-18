import { ipcMain } from "electron";
import { parseOpenSearchResultPayload, parseSearchWindowCommand } from "../../../src/lib/electron/searchWindow";
import {
  dispatchSearchWindowCommand,
  getMainWindow,
  getSearchWindow,
  hideSearchWindow,
  markSearchRendererReady,
  openSearchResultInWorkspace,
} from "../windows";
import { senderWindow } from "./common";

/** 浮动搜索窗专用通道：只接受搜索窗自身发起的调用。 */
export function registerSearchWindowIpc(): void {
  const fromSearchWindow = (event: Electron.IpcMainInvokeEvent) => {
    const win = senderWindow(event);
    return Boolean(win && win === getSearchWindow() && event.senderFrame === event.sender.mainFrame);
  };

  ipcMain.handle("desktop:searchWindowReady", async (event) => {
    if (fromSearchWindow(event)) markSearchRendererReady(senderWindow(event));
  });

  ipcMain.handle("desktop:hideSearchWindow", async (event) => {
    if (fromSearchWindow(event)) hideSearchWindow();
  });

  ipcMain.handle("desktop:openSearchResult", async (event, value: unknown) => {
    if (!fromSearchWindow(event)) return false;
    const payload = parseOpenSearchResultPayload(value);
    if (!payload) return false;
    // 先把结果回给搜索窗，再收起它并唤出主窗。
    setImmediate(() => openSearchResultInWorkspace(payload));
    return true;
  });

  ipcMain.handle("desktop:searchWindowCommand", async (event, value: unknown) => {
    if (!fromSearchWindow(event)) return false;
    const command = parseSearchWindowCommand(value);
    if (!command) return false;
    const main = getMainWindow();
    const mainAlive = Boolean(main && !main.isDestroyed());
    setImmediate(() => dispatchSearchWindowCommand(command));
    return command.type === "hide-recent" || command.type === "archive-ai" ? mainAlive : true;
  });
}
