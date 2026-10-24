import {
  electronAcceleratorAliases,
  toElectronAccelerator,
  type AcceleratorPlatform,
} from "./accelerator";

export function platformRegistersGlobalShortcuts(
  platform: AcceleratorPlatform,
): boolean {
  return platform === "darwin" || platform === "win32" || platform === "linux";
}

export function windowsGlobalAccelerator(accelerator: string): string {
  if (!accelerator) return "";
  const parts = accelerator
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (
        lower === "commandorcontrol" ||
        lower === "cmdorctrl" ||
        lower === "cmdorcontrol"
      ) {
        return "Control";
      }
      if (
        lower === "command" ||
        lower === "cmd" ||
        lower === "meta" ||
        lower === "super" ||
        lower === "win" ||
        lower === "windows"
      ) {
        return "Super";
      }
      if (lower === "ctrl" || lower === "control") return "Control";
      if (lower === "option" || lower === "alt") return "Alt";
      if (lower === "shift") return "Shift";
      return part.length === 1 ? part.toUpperCase() : part;
    });
  return parts.join("+");
}

export function globalShortcutRegisterOrder(
  shortcut: string,
  platform: AcceleratorPlatform,
): string[] {
  const accelerator = toElectronAccelerator(shortcut, platform);
  if (!accelerator) return [];
  if (platform === "win32") {
    const canonical = windowsGlobalAccelerator(accelerator);
    return canonical ? [canonical] : [];
  }
  return electronAcceleratorAliases(accelerator, platform);
}

export function planGlobalHotkeyBinds(
  keys: { wake: string; quicknote: string; search: string },
  platform: AcceleratorPlatform,
): { wake: string; quicknote: string; search: string } {
  const primary = (shortcut: string) => {
    if (!shortcut.trim()) return "";
    return globalShortcutRegisterOrder(shortcut, platform)[0] ?? "";
  };
  return {
    wake: primary(keys.wake),
    quicknote: primary(keys.quicknote),
    search: primary(keys.search),
  };
}

export function registerPlannedAccelerator(
  accelerator: string,
  platform: AcceleratorPlatform,
  register: (candidate: string) => boolean,
): string {
  if (!accelerator || !platformRegistersGlobalShortcuts(platform)) return "";
  for (const candidate of globalShortcutRegisterOrder(accelerator, platform)) {
    try {
      if (register(candidate)) return candidate;
    } catch {
    }
  }
  return "";
}
