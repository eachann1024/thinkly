import { isElectronRuntime } from "@/lib/electron/runtime";

export function getLightboxWindowChrome(container: HTMLElement | null): "mac" | "frameless" | null {
  // The quick-note window deliberately has no native window controls.
  if (!isElectronRuntime() || !container || container.closest(".quicknote-root") ||
      !container.closest(".workspace-shell[data-electron-chrome]")) return null;
  if (/Mac/i.test(navigator.platform)) return "mac";
  if (/Win|Linux/i.test(navigator.platform)) return "frameless";
  return null;
}
