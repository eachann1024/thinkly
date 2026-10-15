import { BrowserWindow } from "electron";
import type { AppUpdateState } from "../../../src/lib/appUpdateTypes";

let state: AppUpdateState = { status: "idle" };
export const getUpdateState = (): AppUpdateState => ({ ...state });
export function setUpdateState(next: AppUpdateState): void {
  state = next;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("desktop:update-state", state);
  }
}
