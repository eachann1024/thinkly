import { BrowserWindow } from "electron";
import {
  SPLIT_LAYOUT_MENU_EVENT,
  type SplitLayoutMenuAction,
} from "../../../src/lib/editor-split/layoutMenu";
import { getMainWindow } from "../windows";

export function dispatchSplitLayout(
  win: Electron.BaseWindow | undefined,
  action: SplitLayoutMenuAction,
): void {
  const target = win instanceof BrowserWindow ? win : getMainWindow();
  if (!target || target.isDestroyed()) return;
  const detail = JSON.stringify(action);
  void target.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(SPLIT_LAYOUT_MENU_EVENT)},{detail:${detail}}))`,
  );
}

export function splitLayoutViewItems(
  label: (key: "splitColumns" | "splitRows" | "splitGrid" | "splitEqualize") => string,
): Electron.MenuItemConstructorOptions[] {
  const send = (action: SplitLayoutMenuAction) =>
    (_item: Electron.MenuItem, browserWindow: Electron.BaseWindow | undefined) => {
      dispatchSplitLayout(browserWindow, action);
    };
  return [
    { type: "separator" },
    { label: label("splitColumns"), click: send("columns") },
    { label: label("splitRows"), click: send("rows") },
    { label: label("splitGrid"), click: send("grid") },
    { label: label("splitEqualize"), accelerator: "CommandOrControl+Alt+E", click: send("equalize") },
  ];
}
