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
