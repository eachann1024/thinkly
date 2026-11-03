import { BrowserWindow } from "electron";
import { appearanceBackgroundColor, bindWindowAppearance } from "../../appearance";
import { denyWindowOpenHandler } from "../configuration";
import {
  clampLiveWindow,
  readNormalBounds,
  scheduleAuxiliaryBounds,
} from "./bounds";

export type StandaloneFrameOptions = {
  boundsKey: string;
  minWidth: number;
  minHeight: number;
  rememberSize: boolean;
  escDismiss: boolean;
  externalLinks: boolean;
};

function isEscape(input: Electron.Input): boolean {
  if (input.type !== "keyDown") return false;
  if (input.alt || input.meta || input.control || input.shift) return false;
  return input.key === "Escape" || input.code === "Escape";
}

export function attachStandaloneFrame(win: BrowserWindow, options: StandaloneFrameOptions): void {
  bindWindowAppearance(win, false, false);
  const min = { width: options.minWidth, height: options.minHeight };
  if (options.externalLinks) denyWindowOpenHandler(win);
  else win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.on("will-redirect", (event) => event.preventDefault());
  const session = win.webContents.session;
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.setPermissionCheckHandler(() => false);
  if (options.escDismiss) {
    win.webContents.on("before-input-event", (event, input) => {
      if (win.webContents.isDevToolsFocused()) return;
      if (!isEscape(input)) return;
      event.preventDefault();
      if (input.isAutoRepeat) return;
      if (!win.isDestroyed()) win.close();
    });
  }
  const remember = () => {
    if (!options.rememberSize) return;
    const bounds = readNormalBounds(win);
    if (bounds) scheduleAuxiliaryBounds(options.boundsKey, bounds);
  };
  win.on("move", remember);
  win.on("resize", remember);
  win.on("show", () => clampLiveWindow(win, min));
  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) win.show();
  });
}

export function standaloneBackground(): string {
  return appearanceBackgroundColor();
}
