import { BrowserWindow, ipcMain, nativeTheme } from "electron";
import { APPEARANCE_KEYS, type AppearanceSnapshot } from "../../src/lib/appearance-contract";
let snapshot: AppearanceSnapshot | null = null;
const solidWindows = new Set<BrowserWindow>();
const publishers = new Set<BrowserWindow>();
export function appearanceBackgroundColor(): string {
  if (snapshot) return snapshot.backgroundColor;
  return nativeTheme.shouldUseDarkColors ? "#191919" : "#ffffff";
}
export function bindWindowAppearance(win: BrowserWindow, material = false, publishes = true): void {
  if (publishes) publishers.add(win);
  if (!material) {
    solidWindows.add(win);
    win.setBackgroundColor(appearanceBackgroundColor());
  }
  win.once("closed", () => {
    solidWindows.delete(win);
    publishers.delete(win);
  });
}
function updateBackgrounds(): void {
  for (const win of solidWindows) if (!win.isDestroyed()) win.setBackgroundColor(appearanceBackgroundColor());
}
export function registerAppearanceIpc(): void {
  ipcMain.handle("desktop:appearance-get", () => snapshot);
  ipcMain.on("desktop:appearance-publish", (event, payload: AppearanceSnapshot) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender || !publishers.has(sender) || !payload ||
      !["light", "dark", "system"].includes(payload.theme) ||
      !["light", "dark"].includes(payload.resolvedTheme) ||
      typeof payload.backgroundColor !== "string" || !/^#[0-9a-f]{6}$/i.test(payload.backgroundColor)) return;
    const fields = Object.fromEntries(APPEARANCE_KEYS.map((key) => [key, payload[key]]));
    const next = { ...fields, resolvedTheme: payload.resolvedTheme, backgroundColor: payload.backgroundColor } as AppearanceSnapshot;
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    snapshot = next;
    updateBackgrounds();
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents.id !== event.sender.id) {
        win.webContents.send("desktop:appearance-changed", snapshot);
      }
    }
  });
  nativeTheme.on("updated", () => {
    if (!snapshot) updateBackgrounds();
  });
}
