import { BrowserWindow } from "electron";
import type { AppUpdateState } from "../../../src/lib/appUpdateTypes";
import { appUpdateTransition, type AppUpdateEvent } from "../../../src/lib/appUpdateState";

let state: AppUpdateState = { status: "idle" };
export const getUpdateState = (): AppUpdateState => ({ ...state });
export function sendUpdateEvent(event: AppUpdateEvent): void {
  const next = appUpdateTransition(state, event);
  if (next === state) return;
  state = next;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("desktop:update-state", state);
  }
}
