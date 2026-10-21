import {
  electronAcceleratorAliases,
  toElectronAccelerator,
  type AcceleratorPlatform,
} from "./accelerator";

/**
 * 全局热键要在 macOS、Windows、Linux 上都交给系统注册。
 * 不能只在 darwin 分支里调用 globalShortcut.register。
 */
export function platformRegistersGlobalShortcuts(
  platform: AcceleratorPlatform,
): boolean {
  return platform === "darwin" || platform === "win32" || platform === "linux";
}

/**
 * Windows 上交给 globalShortcut.register 的加速键。
 *
 * Electron 44（Chromium 152）的 RegisterHotKey 只带 Control / Alt / Shift，
 * 不带 MOD_WIN。加速键里若含 Command，register() 仍返回 true，但 WM_HOTKEY
 * 回来时对不上回调，热键等于没注册上。CommandOrControl 必须先写成 Control。
 * Win 不是 Electron 的修饰键 token，写进去会把修饰键丢掉还返回 true。
 */
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

/** 按顺序交给 globalShortcut.register 的加速键。空快捷键返回空数组。 */
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

/**
 * 把计划中的加速键交给 register。Windows 与 macOS 走同一条调用，
 * 只是 Windows 用 Control/Alt/Shift/Super，macOS 仍用 CommandOrControl。
 */
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
      // 下一条写法
    }
  }
  return "";
}
