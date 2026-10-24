import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  inputMatchesAccelerator,
  toElectronAccelerator,
} from "../../src/lib/electron/accelerator";
import {
  globalShortcutRegisterOrder,
  planGlobalHotkeyBinds,
  platformRegistersGlobalShortcuts,
  registerPlannedAccelerator,
} from "../../src/lib/electron/globalShortcutPlan";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const DEFAULTS = {
  wake: "CmdOrCtrl+Alt+N",
  quicknote: "Alt+N",
  search: "CmdOrCtrl+Shift+K",
};

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· Windows 加速键");
  const windows = planGlobalHotkeyBinds(DEFAULTS, "win32");
  check(
    "唤出主窗口是 Control+Alt+N",
    windows.wake === "Control+Alt+N",
    windows.wake,
  );
  check("唤出速记是 Alt+N", windows.quicknote === "Alt+N", windows.quicknote);
  check(
    "唤出搜索是 Control+Shift+K",
    windows.search === "Control+Shift+K",
    windows.search,
  );
  const windowsJoined = `${windows.wake}+${windows.quicknote}+${windows.search}`;
  check(
    "不含 Command / CommandOrControl",
    !windowsJoined.includes("Command"),
  );
  const winKey = globalShortcutRegisterOrder("Win+Shift+K", "win32")[0] ?? "";
  check("Win 键写成 Super", winKey === "Super+Shift+K", winKey);
  check(
    "不把无效的 Win token 交给注册",
    !winKey.split("+").includes("Win"),
    winKey,
  );
  check(
    "应用内转换仍保留 CommandOrControl",
    toElectronAccelerator("Mod+K", "win32") === "CommandOrControl+K" &&
      toElectronAccelerator("CmdOrCtrl+Shift+K", "darwin") === "CommandOrControl+Shift+K",
  );

  console.log("· 注册调用");
  check("Windows 在注册平台里", platformRegistersGlobalShortcuts("win32"));
  check("macOS 仍注册", platformRegistersGlobalShortcuts("darwin"));
  check("Linux 仍注册", platformRegistersGlobalShortcuts("linux"));
  const calls: string[] = [];
  for (const shortcut of [windows.wake, windows.quicknote, windows.search]) {
    const bound = registerPlannedAccelerator(shortcut, "win32", (candidate) => {
      calls.push(candidate);
      return true;
    });
    check(`${shortcut} 会调用注册`, bound === shortcut && calls.at(-1) === shortcut);
  }
  check("三条全局热键都会注册", calls.length === 3, calls);
  const missed: string[] = [];
  const failed = registerPlannedAccelerator("Alt+N", "win32", (candidate) => {
    missed.push(candidate);
    return false;
  });
  check("注册失败不假装成功", failed === "" && missed.length === 1, { failed, missed });
  const macCalls: string[] = [];
  const macBound = registerPlannedAccelerator("CmdOrCtrl+Alt+N", "darwin", (candidate) => {
    macCalls.push(candidate);
    return candidate === "CommandOrControl+Alt+N";
  });
  check(
    "macOS 仍先注册 CommandOrControl",
    macCalls[0] === "CommandOrControl+Alt+N" && macBound === "CommandOrControl+Alt+N",
    macCalls,
  );

  console.log("· 前台按键仍能对上");
  const searchInput = {
    type: "keyDown",
    key: "K",
    code: "KeyK",
    control: true,
    shift: true,
    alt: false,
    meta: false,
  };
  check(
    "Windows Ctrl+Shift+K 对上搜索",
    inputMatchesAccelerator(
      searchInput,
      toElectronAccelerator(DEFAULTS.search, "win32"),
      "win32",
    ),
  );
  check(
    "Windows 上 Win+Shift+K 不算 Ctrl+Shift+K",
    !inputMatchesAccelerator(
      { ...searchInput, control: false, meta: true },
      toElectronAccelerator(DEFAULTS.search, "win32"),
      "win32",
    ),
  );
  check(
    "macOS ⌘⇧K 仍对上",
    inputMatchesAccelerator(
      { ...searchInput, control: false, meta: true },
      toElectronAccelerator(DEFAULTS.search, "darwin"),
      "darwin",
    ),
  );
  check(
    "Windows Alt+N 对上速记",
    inputMatchesAccelerator(
      { type: "keyDown", key: "n", code: "KeyN", control: false, alt: true, shift: false, meta: false },
      toElectronAccelerator(DEFAULTS.quicknote, "win32"),
      "win32",
    ),
  );
  check(
    "Windows Ctrl+Alt+N 对上主窗口",
    inputMatchesAccelerator(
      { type: "keyDown", key: "N", code: "KeyN", control: true, alt: true, shift: false, meta: false },
      toElectronAccelerator(DEFAULTS.wake, "win32"),
      "win32",
    ),
  );

  console.log("· 主进程");
  const hotkeys = read("electron/main/hotkeys.ts");
  const activation = read("electron/main/windows/activation.ts");
  check("主进程调用 globalShortcut.register", hotkeys.includes("globalShortcut.register"));
  check("注册走计划函数", hotkeys.includes("registerPlannedAccelerator"));
  check(
    "register 不包在 darwin 分支里",
    !/if\s*\([^)]*darwin[^)]*\)\s*\{[^}]*globalShortcut\.register/s.test(hotkeys),
  );
  check(
    "Windows 抢前台",
    activation.includes('process.platform === "win32"') &&
      activation.includes("setAlwaysOnTop(true)") &&
      activation.includes("claimWindowsForeground"),
  );

  return checker.failed;
}
