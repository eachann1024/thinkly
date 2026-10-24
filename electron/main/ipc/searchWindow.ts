import { BrowserWindow, ipcMain, type IpcMainEvent } from "electron";
import {
  SEARCH_AI_SETTINGS_PUBLISH_CHANNEL,
  SEARCH_AI_SETTINGS_PUSH_CHANNEL,
  parseSearchAISettings,
  type SearchAISettingsSnapshot,
} from "../../../src/lib/electron/searchAISettings";
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
import { registry } from "../windows/state";

let cachedWorkspaceAI: SearchAISettingsSnapshot | null = null;

function rememberWorkspaceAI(event: IpcMainEvent, value: unknown): void {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || registry.findByWin(win)?.kind !== "workspace") return;
  const snapshot = parseSearchAISettings(value);
  if (!snapshot?.hydrated) return;
  cachedWorkspaceAI = snapshot;
  const search = getSearchWindow();
  if (!search || search.isDestroyed() || search.webContents.isDestroyed()) return;
  search.webContents.send(SEARCH_AI_SETTINGS_PUSH_CHANNEL, snapshot);
}

export function registerSearchWindowIpc(): void {
  ipcMain.on(SEARCH_AI_SETTINGS_PUBLISH_CHANNEL, rememberWorkspaceAI);
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
    setImmediate(() => openSearchResultInWorkspace(payload));
    return true;
  });

  ipcMain.handle("desktop:pullWorkspaceAISettings", (event) => {
    if (!fromSearchWindow(event)) return null;
    return cachedWorkspaceAI;
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
