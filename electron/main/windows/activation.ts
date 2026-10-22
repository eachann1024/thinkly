import { app, BrowserWindow } from "electron";
import { shouldOrderFloatingWithFocusedWorkspace } from "../../../src/lib/electron/floatingRaise";
import {
  resolveWindowToggleAction,
  shouldRaiseMainWindow,
} from "../../../src/lib/electron/windowToggle";
import { setHiddenThrottle } from "./configuration";
import { markQuicknoteActivateSuppressed } from "./visibility";
import { createWorkspaceWindow } from "./workspace";
import { createQuicknoteWindow } from "./quicknote";
import { getMainWindow, getQuicknoteWindow } from "./registry";
import { registry } from "./state";
import {
  captureParkedWorkspaces,
  forgetParkedWorkspaces,
  releaseWorkspacePark,
  settleParkedWorkspaces,
} from "./park";

export function waitReadyToShow(
  win: BrowserWindow,
  timeoutMs = 8000,
): Promise<void> {
  if (
    win.isDestroyed() ||
    win.webContents.isDestroyed() ||
    !win.webContents.isLoading()
  ) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    win.once("ready-to-show", done);
    win.once("closed", done);
    win.webContents.once("did-finish-load", done);
  });
}

/**
 * Windows 前台锁会丢掉 globalShortcut 回调里的 show/focus，窗口停在后面。
 * 先置顶再聚焦，SetForegroundWindow 才会生效；主窗随后取消置顶。
 */
function claimWindowsForeground(win: BrowserWindow): void {
  const keepOnTop = win.isAlwaysOnTop();
  win.setAlwaysOnTop(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.moveTop();
  win.focus();
  if (!keepOnTop && !win.isDestroyed()) win.setAlwaysOnTop(false);
}

/** 全局热键唤出时必须抢前台；macOS 不 steal 时 frameless 小窗常常不出现。 */
export function raiseWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  releaseWorkspacePark(win);
  if (win.isMinimized()) win.restore();
  setHiddenThrottle(win, false);
  if (process.platform === "win32") {
    claimWindowsForeground(win);
    return;
  }
  win.show();
  win.moveTop();
  win.focus();
  if (process.platform === "darwin") {
    app.focus({ steal: true });
  }
}

export function focusedWorkspaceWindow(): BrowserWindow | null {
  for (const record of registry.workspaces()) {
    const workspace = record.win;
    if (
      workspace &&
      !workspace.isDestroyed() &&
      workspace.isVisible() &&
      !workspace.isMinimized() &&
      workspace.isFocused()
    ) {
      return workspace;
    }
  }
  return null;
}

/**
 * 只抬浮动小窗（速记、搜索），不激活整个应用，也不 show / restore 主窗。
 * macOS 上 moveTop（orderWindow）和普通 show / focus 会把已最小化或藏在后面的 workspace 一起带出来。
 */
export function raiseFloatingWindow(win: BrowserWindow): void {
  markQuicknoteActivateSuppressed();
  const focused = focusedWorkspaceWindow();
  const parked = captureParkedWorkspaces();
  if (win.isDestroyed()) {
    forgetParkedWorkspaces(parked);
    return;
  }
  // 只还原浮动窗自己。workspace 的最小化交给停放逻辑。
  if (win.isMinimized()) win.restore();
  setHiddenThrottle(win, false);
  if (process.platform === "darwin") {
    win.showInactive();
    if (!win.isDestroyed()) win.focus();
  } else if (process.platform === "win32") {
    claimWindowsForeground(win);
  } else {
    win.show();
    win.moveTop();
    win.focus();
  }
  settleParkedWorkspaces(parked);
  // 主窗本来就在前台时，panel 获焦可能把它压到别的应用后面；排回普通层，再让浮动窗叠在上面。
  if (
    focused &&
    !focused.isDestroyed() &&
    shouldOrderFloatingWithFocusedWorkspace(true)
  ) {
    focused.moveTop();
    if (!win.isDestroyed()) win.moveTop();
  }
  if (parked.minimized.length === 0 && parked.hidden.length === 0) return;
  setImmediate(() => {
    markQuicknoteActivateSuppressed();
    settleParkedWorkspaces(parked);
  });
  // deminiaturize 可能晚于这次调用才落地。
  setTimeout(() => settleParkedWorkspaces(parked), 50);
  setTimeout(() => settleParkedWorkspaces(parked), 300);
  setTimeout(() => forgetParkedWorkspaces(parked), 1_500);
}

export async function toggleWindow(win: BrowserWindow | null): Promise<void> {
  if (!win || win.isDestroyed()) return;
  const visible = win.isVisible();
  const focused = visible && win.isFocused();
  const action = resolveWindowToggleAction({ visible, focused });
  if (action === "hide") {
    win.hide();
    setHiddenThrottle(win, true);
    return;
  }
  raiseWindow(win);
}

/**
 * 首次唤起才创建速记窗，避免启动就多一个 renderer。
 *
 * 速记快捷键是严格二态切换：只要窗口可见，再次按键就关闭，不因全局
 * 快捷键触发时焦点短暂转移而重新聚焦。这里不调用 toggleWindow，避免改变
 * workspace 窗口原有的「可见但未聚焦时先聚焦」行为。
 */
export async function toggleQuicknoteWindow(): Promise<void> {
  let win = getQuicknoteWindow();
  if (!win) {
    win = createQuicknoteWindow();
    await waitReadyToShow(win);
    if (win.isDestroyed()) return;
    raiseFloatingWindow(win);
    return;
  }
  if (win.isVisible()) {
    closeQuicknote();
    return;
  }
  raiseFloatingWindow(win);
}

export function closeQuicknote(): void {
  const win = getQuicknoteWindow();
  if (!win || win.isDestroyed()) return;
  markQuicknoteActivateSuppressed();
  win.close();
}

/** 全局搜索热键：显示并聚焦最近活动 workspace 窗，不 toggle 隐藏。已在前台则跳过 raise，避免 steal focus 卡顿。 */
export function showAndFocusMainWindow(): void {
  showOrCreateMainWindow();
}

/**
 * 只显示主窗，不走三态隐藏。小窗前台、功能转发、搜索热键都走这里。
 * 没有 workspace 时补开一扇空白窗。
 */
export function showOrCreateMainWindow(): BrowserWindow {
  let win = getMainWindow();
  if (!win || win.isDestroyed()) {
    win = createWorkspaceWindow({ mode: "blank" });
  }
  releaseWorkspacePark(win);
  if (
    shouldRaiseMainWindow({
      visible: win.isVisible(),
      minimized: win.isMinimized(),
      focused: win.isFocused(),
    })
  ) {
    raiseWindow(win);
  }
  return win;
}
