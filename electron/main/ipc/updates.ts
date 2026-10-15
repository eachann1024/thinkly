import { ipcMain } from "electron";
import {
  checkForAppUpdate,
  downloadAppUpdate,
  getReadyUpdate,
  installReadyUpdate,
  getAppVersion,
  getUpdateState,
} from "../appUpdate";

export function registerUpdatesIpc(): void {
  ipcMain.handle("desktop:getAppVersion", async () => getAppVersion());

  ipcMain.handle("desktop:checkForUpdate", async () => checkForAppUpdate());

  ipcMain.handle("desktop:getReadyUpdate", () => getReadyUpdate());

  ipcMain.handle("desktop:getUpdateState", () => getUpdateState());

  ipcMain.handle("desktop:installReadyUpdate", () => installReadyUpdate());

  ipcMain.handle(
    "desktop:downloadUpdate",
    async (_event, downloadUrl: string, filename: string) => {
      const result = await downloadAppUpdate(
        String(downloadUrl ?? ""),
        String(filename ?? ""),
      );
      return result;
    },
  );
}
