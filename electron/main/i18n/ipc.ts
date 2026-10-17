import { getAssetMaintenanceWindow, getQuicknoteWindow, lookupWindowContext } from "../windows";
import { app, BrowserWindow, ipcMain } from "electron";
import { getLanguageSnapshot, saveLanguagePreference } from "./store";
import { setLanguageSnapshot } from "../../../src/i18n/core";
import { installMenu, localizedAppName } from "./menu";
import { t as attachmentText } from "./attachments";

export function registerLanguageIpc(): void {
  ipcMain.on("desktop:language-initial", (event) => {
    event.returnValue = getLanguageSnapshot();
  });
  ipcMain.handle("desktop:language-get", () => getLanguageSnapshot());
  const save = async (preference: unknown) => {
    const snapshot = await saveLanguagePreference(preference);
    setLanguageSnapshot(snapshot);
    // Persistence has succeeded: a closed window or a native menu failure must
    // not report a failed save or prevent other windows receiving the snapshot.
    try { app.setName(localizedAppName()); installMenu(); }
    catch (error) { console.error("[i18n] Could not refresh application menu", error); }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        try {
          if (win === getQuicknoteWindow()) win.setTitle(attachmentText("quicknoteTitle"));
          if (win === getAssetMaintenanceWindow()) win.setTitle(attachmentText("cleanupTitle"));
        } catch (error) { console.error("[i18n] Could not refresh window title", error); }
        try { win.webContents.send("desktop:language-changed", snapshot); }
        catch (error) { console.error("[i18n] Could not refresh window language", error); }
      }
    }
    return snapshot;
  };
  const assertWorkspace = (event: Electron.IpcMainInvokeEvent) => {
    if (event.senderFrame !== event.sender.mainFrame || lookupWindowContext(BrowserWindow.fromWebContents(event.sender))?.kind !== "workspace") {
      throw new Error("language.untrustedWindow");
    }
  };
  ipcMain.handle("desktop:language-set", (event, preference: unknown) => { assertWorkspace(event); return save(preference); });
  ipcMain.handle("desktop:language-reset", (event) => { assertWorkspace(event); return save("system"); });
}
