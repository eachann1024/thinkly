import { BrowserWindow } from "electron";
import {
  comingForwardOp,
  correctionForParked,
  parkedWorkspaceKind,
  type ParkedWorkspace,
} from "../../../src/lib/electron/floatingRaise";
import {
  registry,
  workspaceParkLock,
  workspacesHeldHidden,
  workspacesHeldMinimized,
} from "./state";

export type ParkedSets = {
  minimized: BrowserWindow[];
  hidden: BrowserWindow[];
};

/** 记下唤出浮动窗之前已经最小化或隐藏的 workspace，供随后按回去。 */
export function captureParkedWorkspaces(): ParkedSets {
  const minimized: BrowserWindow[] = [];
  const hidden: BrowserWindow[] = [];
  for (const record of registry.workspaces()) {
    const workspace = record.win;
    if (!workspace || workspace.isDestroyed()) continue;
    const kind = parkedWorkspaceKind({
      visible: workspace.isVisible(),
      minimized: workspace.isMinimized(),
      focused: workspace.isFocused(),
    });
    if (kind === "minimized") {
      minimized.push(workspace);
      workspacesHeldMinimized.add(workspace);
    } else if (kind === "hidden") {
      hidden.push(workspace);
      workspacesHeldHidden.add(workspace);
    }
  }
  return { minimized, hidden };
}

/** 用户主动唤出主窗时放开停放，否则 show / restore 会被立刻按回去。 */
export function releaseWorkspacePark(win: BrowserWindow): void {
  workspacesHeldHidden.delete(win);
  workspacesHeldMinimized.delete(win);
}

export function settleParkedWorkspaces(parked: ParkedSets): void {
  for (const workspace of parked.minimized) {
    if (workspacesHeldMinimized.has(workspace)) applyCorrection(workspace, "minimized");
  }
  for (const workspace of parked.hidden) {
    if (workspacesHeldHidden.has(workspace)) applyCorrection(workspace, "hidden");
  }
}

export function forgetParkedWorkspaces(parked: ParkedSets): void {
  for (const workspace of parked.minimized) workspacesHeldMinimized.delete(workspace);
  for (const workspace of parked.hidden) workspacesHeldHidden.delete(workspace);
}

function applyCorrection(win: BrowserWindow, parked: ParkedWorkspace): void {
  if (win.isDestroyed() || workspaceParkLock.has(win)) return;
  const op = correctionForParked(parked, {
    visible: win.isVisible(),
    minimized: win.isMinimized(),
  });
  if (!op) return;
  workspaceParkLock.add(win);
  try {
    if (op === "minimize" && !win.isMinimized()) win.minimize();
    if (op === "hide" && win.isVisible() && !win.isMinimized()) win.hide();
  } finally {
    workspaceParkLock.delete(win);
  }
}

/**
 * 主窗 show / restore 时调用。事件到达时 isMinimized / isVisible 可能还没翻过来，
 * 所以按停放种类直接按回去，不看当前标志。
 * 返回 true 表示这次显示不是用户要看主窗。
 */
export function restrainParkedWorkspace(win: BrowserWindow): boolean {
  if (workspacesHeldMinimized.has(win)) {
    putBack(win, "minimized");
    return true;
  }
  if (workspacesHeldHidden.has(win)) {
    putBack(win, "hidden");
    return true;
  }
  return false;
}

function putBack(win: BrowserWindow, parked: ParkedWorkspace): void {
  if (win.isDestroyed() || workspaceParkLock.has(win)) return;
  const op = comingForwardOp(parked);
  workspaceParkLock.add(win);
  try {
    if (op === "minimize") {
      if (!win.isMinimized()) win.minimize();
    } else {
      win.hide();
    }
  } finally {
    workspaceParkLock.delete(win);
  }
}
