import { BrowserWindow, ipcMain } from "electron";
import { registerNotificationIpc, showActionableNotification } from "../notifications";
import { lookupWindowContext } from "../windows";
import {
  registerHotkeys,
  pauseGlobalHotkeys,
  resumeGlobalHotkeys,
} from "../hotkeys";
import {
  getAccessibilityStatus,
  requestMacAccessibilityAccess,
} from "../accessibility";

export function registerHotkeysIpc(): void {
  registerNotificationIpc();
  ipcMain.handle(
    "desktop:registerHotkeys",
    async (
      _event,
      keys: { wake: string; quicknote: string; search: string },
    ) => {
      return registerHotkeys(keys);
    },
  );

  ipcMain.handle("desktop:pauseHotkeys", async () => {
    pauseGlobalHotkeys();
  });

  ipcMain.handle("desktop:resumeHotkeys", async () => {
    return resumeGlobalHotkeys();
  });

  ipcMain.handle("desktop:getAccessibilityStatus", async () => {
    return getAccessibilityStatus();
  });

  ipcMain.handle("desktop:requestAccessibility", async () => {
    return requestMacAccessibilityAccess();
  });

  ipcMain.handle(
    "desktop:notify",
    async (event, n: unknown) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (event.senderFrame !== event.sender.mainFrame || !lookupWindowContext(win)) return;
      if (!n || typeof n !== "object" || !("title" in n) || !("body" in n) || typeof n.title !== "string" || typeof n.body !== "string") return;
      showActionableNotification({ title: n.title, body: n.body }, { type: "workspace" }, win);
    },
  );
}
