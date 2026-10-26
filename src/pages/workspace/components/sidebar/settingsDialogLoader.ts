import { deferredComponent } from "@/lib/deferredComponent";
import type { SettingsDialogProps } from "./settings-dialog/shared";

export const settingsDialog = deferredComponent<SettingsDialogProps>(() =>
  import("./SettingsDialog").then((module) => ({ default: module.SettingsDialog })),
);

export function preloadSettingsDialog(): void {
  void settingsDialog.load().catch((error: unknown) => {
    console.error("Settings dialog preload failed", error);
  });
}
