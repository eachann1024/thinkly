import { BrowserWindow, systemPreferences } from "electron";

export function applySystemMaterial(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  if (process.platform === "win32") {
    try {
      win.setBackgroundMaterial("mica");
    } catch (error) {
      console.warn("[system-material] setBackgroundMaterial failed", error);
    }
    return;
  }

  if (process.platform === "darwin") {
    try {
      win.setVibrancy("under-window");
      if (typeof win.setVisualEffectState === "function") {
        win.setVisualEffectState("active");
      }
      win.setBackgroundColor("#00000000");
    } catch (error) {
      console.warn("[system-material] setVibrancy failed", error);
    }
    void systemPreferences.getAnimationSettings?.();
  }
}

export function workspaceWindowMaterialOptions(): {
  backgroundMaterial?: "mica";
  vibrancy?: "under-window";
  visualEffectState?: "active";
  backgroundColor: string;
} {
  if (process.platform === "win32") {
    return {
      backgroundMaterial: "mica",
      backgroundColor: "#00000000",
    };
  }
  if (process.platform === "darwin") {
    return {
      vibrancy: "under-window",
      visualEffectState: "active",
      backgroundColor: "#00000000",
    };
  }
  return { backgroundColor: "#ffffff" };
}
