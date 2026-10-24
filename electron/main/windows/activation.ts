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
  type ParkedSets,
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

function claimWindowsForeground(win: BrowserWindow): void {
  const keepOnTop = win.isAlwaysOnTop();
  win.setAlwaysOnTop(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.moveTop();
  win.focus();
  if (!keepOnTop && !win.isDestroyed()) win.setAlwaysOnTop(false);
}

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

export function raiseFloatingWindow(
  win: BrowserWindow,
  parked: ParkedSets = captureParkedWorkspaces(),
): void {
  markQuicknoteActivateSuppressed();
  const focused = focusedWorkspaceWindow();
  if (win.isDestroyed()) {
    forgetParkedWorkspaces(parked);
    return;
  }
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

export async function toggleQuicknoteWindow(): Promise<void> {
  let win = getQuicknoteWindow();
  if (win && !win.isDestroyed() && win.isVisible()) {
    closeQuicknote();
    return;
  }
  const parked = captureParkedWorkspaces();
  if (!win || win.isDestroyed()) {
    win = createQuicknoteWindow();
    await waitReadyToShow(win);
    if (win.isDestroyed()) {
      forgetParkedWorkspaces(parked);
      return;
    }
  }
  raiseFloatingWindow(win, parked);
}

export function closeQuicknote(): void {
  const win = getQuicknoteWindow();
  if (!win || win.isDestroyed()) return;
  markQuicknoteActivateSuppressed();
  win.close();
}

export function showAndFocusMainWindow(): void {
  showOrCreateMainWindow();
}

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
