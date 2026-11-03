import { t } from "../i18n/attachments";
import { BrowserWindow } from "electron";
import {
  applyTrafficLightPosition,
  framelessWindowIcon,
  rendererDevUrl,
  rendererFile,
  sharedWebPrefs,
  trafficLightPosition,
} from "./configuration";
import { bindCloseTabAccelerator } from "./close";
import { clampAuxiliaryBox, readAuxiliaryBounds } from "./auxiliary/bounds";
import { attachStandaloneFrame, standaloneBackground } from "./auxiliary/frame";

export let assetMaintenanceWindow: BrowserWindow | null = null;

const MIN_WIDTH = 760;
const MIN_HEIGHT = 540;

export function getAssetMaintenanceWindow(): BrowserWindow | null {
  return assetMaintenanceWindow && !assetMaintenanceWindow.isDestroyed()
    ? assetMaintenanceWindow
    : null;
}

function initialBounds(): { x?: number; y?: number; width: number; height: number } {
  const stored = readAuxiliaryBounds("asset-maintenance");
  if (!stored) return { width: 1000, height: 720 };
  try {
    return clampAuxiliaryBox(stored, { width: MIN_WIDTH, height: MIN_HEIGHT });
  } catch {
    return { width: 1000, height: 720 };
  }
}

export function createAssetMaintenanceWindow(): BrowserWindow {
  const existing = getAssetMaintenanceWindow();
  if (existing) {
    existing.show();
    existing.focus();
    return existing;
  }
  const isMac = process.platform === "darwin";
  const bounds = initialBounds();
  const icon = framelessWindowIcon();
  const win = new BrowserWindow({
    title: t("cleanupTitle"),
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    backgroundColor: standaloneBackground(),
    autoHideMenuBar: true,
    frame: isMac,
    ...(isMac ? { titleBarStyle: "hidden" as const, trafficLightPosition: trafficLightPosition() } : {}),
    ...(icon ? { icon } : {}),
    webPreferences: { ...sharedWebPrefs(), partition: "asset-maintenance" },
  });
  if (!isMac) win.setMenuBarVisibility(false);
  applyTrafficLightPosition(win);
  assetMaintenanceWindow = win;
  attachStandaloneFrame(win, {
    boundsKey: "asset-maintenance",
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    rememberSize: true,
    escDismiss: false,
    externalLinks: false,
  });
  bindCloseTabAccelerator(win);
  win.once("closed", () => {
    assetMaintenanceWindow = null;
  });
  const devUrl = rendererDevUrl();
  if (devUrl) void win.loadURL(`${devUrl}/asset-maintenance.html`);
  else void win.loadFile(rendererFile("asset-maintenance.html"));
  return win;
}
