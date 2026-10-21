import { globalShortcut, type BrowserWindow } from "electron";
import {
  electronAcceleratorsMatch,
  inputMatchesAccelerator,
  toElectronAccelerator,
} from "../../src/lib/electron/accelerator";
import { registerPlannedAccelerator } from "../../src/lib/electron/globalShortcutPlan";
import { onBrowserWindowCreated } from "./windows";
import {
  dispatchRegisteredGlobalHotkey,
  type HotkeySlot,
  type HotkeySourceKind,
} from "./hotkeyDispatch";

export { toElectronAccelerator, dispatchRegisteredGlobalHotkey };

const registered = {
  wake: "",
  quicknote: "",
  search: "",
};

type HotkeyRequest = { wake: string; quicknote: string; search: string };

export function matchRegisteredGlobalHotkey(input: {
  type?: string;
  key?: string;
  code?: string;
  control?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}): HotkeySlot | null {
  if (paused) return null;
  for (const slot of ["wake", "quicknote", "search"] as const) {
    const requested = lastRequested[slot];
    if (!requested.trim()) continue;
    const accelerator = toElectronAccelerator(requested);
    if (inputMatchesAccelerator(input, accelerator, process.platform)) {
      return slot;
    }
  }
  return null;
}

function bindGlobalHotkeyInput(
  win: BrowserWindow,
  kind: HotkeySourceKind,
): void {
  win.webContents.on("before-input-event", (event, input) => {
    if (win.webContents.isDevToolsFocused()) return;
    const slot = matchRegisteredGlobalHotkey(input);
    if (!slot) return;
    event.preventDefault();
    dispatchRegisteredGlobalHotkey(slot, kind);
  });
}

onBrowserWindowCreated((win, kind) => {
  bindGlobalHotkeyInput(win, kind);
});

const lastRequested: HotkeyRequest = {
  wake: "",
  quicknote: "",
  search: "",
};

let paused = false;

function unregisterSlot(slot: HotkeySlot): void {
  const existing = registered[slot];
  if (!existing) return;
  try {
    globalShortcut.unregister(existing);
  } catch {
    // ignore
  }
  registered[slot] = "";
}

function isDuplicateAccelerator(
  accelerator: string,
  used: string[],
): boolean {
  return (
    Boolean(accelerator) &&
    used.some((item) =>
      electronAcceleratorsMatch(item, accelerator, process.platform),
    )
  );
}

function copyHotkeyRequest(keys: HotkeyRequest): HotkeyRequest {
  return {
    wake: keys.wake ?? "",
    quicknote: keys.quicknote ?? "",
    search: keys.search ?? "",
  };
}

function tryRegisterAccelerator(
  accelerator: string,
  callback: () => void,
): string {
  return registerPlannedAccelerator(accelerator, process.platform, (candidate) =>
    globalShortcut.register(candidate, callback),
  );
}

function applyRegistration(keys: HotkeyRequest): {
  wakeOk: boolean;
  quicknoteOk: boolean;
  searchOk: boolean;
} {
  const wakeAcc = keys.wake.trim() ? toElectronAccelerator(keys.wake) : "";
  const quickAcc = keys.quicknote.trim()
    ? toElectronAccelerator(keys.quicknote)
    : "";
  const searchAcc = keys.search.trim() ? toElectronAccelerator(keys.search) : "";
  const next = { wake: wakeAcc, quicknote: quickAcc, search: searchAcc };

  // 键没变就别卸：macOS 对同一 accelerator 立刻 unregister+register 经常返回 false。
  for (const slot of ["wake", "quicknote", "search"] as const) {
    if (
      registered[slot] &&
      !electronAcceleratorsMatch(registered[slot], next[slot], process.platform)
    ) {
      unregisterSlot(slot);
    }
  }

  const used: string[] = [];

  const bindSlot = (
    slot: HotkeySlot,
    acc: string,
    requested: string,
    callback: () => void,
  ): boolean => {
    if (!requested.trim()) return true;
    if (!acc) return false;
    if (isDuplicateAccelerator(acc, used)) return false;
    if (electronAcceleratorsMatch(registered[slot], acc, process.platform)) {
      used.push(registered[slot] || acc);
      return true;
    }
    const actual = tryRegisterAccelerator(acc, callback);
    if (!actual) return false;
    registered[slot] = actual;
    used.push(actual);
    return true;
  };

  return {
    wakeOk: bindSlot("wake", wakeAcc, keys.wake, () => {
      dispatchRegisteredGlobalHotkey("wake");
    }),
    quicknoteOk: bindSlot("quicknote", quickAcc, keys.quicknote, () => {
      dispatchRegisteredGlobalHotkey("quicknote");
    }),
    searchOk: bindSlot("search", searchAcc, keys.search, () => {
      dispatchRegisteredGlobalHotkey("search");
    }),
  };
}

export function registerHotkeys(keys: HotkeyRequest): {
  wakeOk: boolean;
  quicknoteOk: boolean;
  searchOk: boolean;
  paused?: boolean;
} {
  Object.assign(lastRequested, copyHotkeyRequest(keys));
  // 录制框仍聚焦时系统热键已卸载。这里只缓存配置，
  // 不能把“已接收”伪装成“已注册”，否则设置页会误报生效。
  if (paused) {
    return { wakeOk: false, quicknoteOk: false, searchOk: false, paused: true };
  }
  return applyRegistration(lastRequested);
}

/** 录制快捷键时先卸掉全局热键，否则系统会先吃掉按键，输入框收不到。 */
export function pauseGlobalHotkeys(): void {
  paused = true;
  unregisterSlot("wake");
  unregisterSlot("quicknote");
  unregisterSlot("search");
}

export function resumeGlobalHotkeys(): {
  wakeOk: boolean;
  quicknoteOk: boolean;
  searchOk: boolean;
} {
  paused = false;
  return applyRegistration(lastRequested);
}

export function unregisterAllHotkeys(): void {
  paused = false;
  try {
    globalShortcut.unregisterAll();
  } catch {
    // ignore
  }
  registered.wake = "";
  registered.quicknote = "";
  registered.search = "";
}
