import { isElectronRuntime } from "@/lib/electron/runtime";

// Title-bar CSS is keyed off these classes. Set them before the first paint.
export function installElectronChrome(): void {
  if (typeof document === "undefined" || !isElectronRuntime()) return;
  const root = document.documentElement;
  root.classList.add("is-electron");
  const platform = navigator.platform;
  if (/Win/i.test(platform)) root.classList.add("is-win");
  if (/Linux/i.test(platform)) root.classList.add("os-linux");
  if (/Mac/i.test(platform)) root.classList.add("os-mac");
}
