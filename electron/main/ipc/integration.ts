import { app, ipcMain, shell } from "electron";
import path from "node:path";
import { assertAllowed, userDataRoot } from "../allowlist";
import { listOpenApps, openTerminalAtPath, openWithApp } from "../apps";
import { withAppIcons } from "../appIcons";
import { saveToDownloads } from "../saveToDownloads";
import { isOpenUrlAllowed } from "./common";

export function registerIntegrationIpc(): void {
  ipcMain.handle("desktop:getUserDataPath", async () => userDataRoot());

  ipcMain.handle("desktop:getDownloadsPath", async () =>
    app.getPath("downloads"),
  );

  ipcMain.handle(
    "desktop:saveToDownloads",
    async (_event, filename: string, data: Uint8Array) => {
      return saveToDownloads(filename, data);
    },
  );

  ipcMain.handle("desktop:joinPath", async (_event, parts: string[]) => {
    return path.join(...parts);
  });

  ipcMain.handle("desktop:openUrl", async (_event, url: string) => {
    if (!isOpenUrlAllowed(url)) {
      throw new Error("只允许打开 http/https 链接");
    }
    await shell.openExternal(url);
  });

  ipcMain.handle("desktop:openPath", async (_event, p: string) => {
    const target = assertAllowed(p);
    const err = await shell.openPath(target);
    if (err) throw new Error(err);
  });

  ipcMain.handle("desktop:showItemInFolder", async (_event, p: string) => {
    const target = assertAllowed(p);
    shell.showItemInFolder(target);
  });

  ipcMain.handle(
    "desktop:listOpenApps",
    async (_event, requestedNames: string[]) => {
      if (
        !Array.isArray(requestedNames) ||
        requestedNames.length > 100 ||
        requestedNames.some(
          (name) => typeof name !== "string" || name.length > 100,
        )
      ) {
        throw new Error("无效的应用列表");
      }
      const names = new Set(requestedNames.map((name) => name.toLowerCase()));
      const found = (await listOpenApps()).filter(
        (item) =>
          names.has(item.name.toLowerCase()) ||
          names.has(
            path
              .basename(item.path)
              .replace(/\.(app|exe)$/i, "")
              .toLowerCase(),
          ),
      );
      return withAppIcons(found);
    },
  );

  ipcMain.handle(
    "desktop:openWithApp",
    async (_event, appName: string, p: string) => {
      const target = assertAllowed(p);
      if (!openWithApp(appName, target)) {
        throw new Error("无法用指定应用打开");
      }
    },
  );

  ipcMain.handle(
    "desktop:openTerminalAtPath",
    async (_event, p: string, terminal?: string) => {
      const target = assertAllowed(p);
      if (
        !openTerminalAtPath(
          target,
          typeof terminal === "string" ? terminal : undefined,
        )
      ) {
        throw new Error("无法在该路径打开终端");
      }
    },
  );
}
