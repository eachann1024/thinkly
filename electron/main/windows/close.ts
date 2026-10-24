import { BrowserWindow } from "electron";
import {
  CLOSE_ACTIVE_TAB_CHANNEL,
  isPrimaryModW,
} from "../closeTabAccelerator";
import { markQuicknoteActivateSuppressed } from "./visibility";
import { getAssetMaintenanceWindow } from "./maintenance";
import { lookupWindowContext } from "./registry";

export function requestCloseActiveTab(
  win: BrowserWindow | null | undefined,
): void {
  if (!win || win.isDestroyed()) return;
  if (win === getAssetMaintenanceWindow()) {
    win.close();
    return;
  }
  const context = lookupWindowContext(win);
  if (context?.kind === "search") {
    markQuicknoteActivateSuppressed();
    win.hide();
    return;
  }
  if (context?.kind === "quicknote") {
    markQuicknoteActivateSuppressed();
    win.close();
    return;
  }
  if (win.webContents.isDestroyed()) return;
  win.webContents.send(CLOSE_ACTIVE_TAB_CHANNEL);
}

export function bindCloseTabAccelerator(win: BrowserWindow): void {
  win.webContents.on("before-input-event", (event, input) => {
    if (win.webContents.isDevToolsFocused()) return;
    if (!isPrimaryModW(input)) return;
    event.preventDefault();
    if (input.isAutoRepeat || input.isComposing) return;
    requestCloseActiveTab(win);
  });
}
