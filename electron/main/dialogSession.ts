import { BrowserWindow } from "electron";

const activeWindows = new Set<number>();
let appDialogOpen = false;
const dialogWaiters = new Set<() => void>();

function releaseDialogWaiters() {
  for (const resolve of dialogWaiters) resolve();
  dialogWaiters.clear();
}

export async function withQueuedWindowDialog<T>(
  win: BrowserWindow | null,
  operation: (owner: BrowserWindow | null) => Promise<T>,
): Promise<T> {
  while ((win && !win.isDestroyed() ? activeWindows.has(win.id) : appDialogOpen)) {
    await new Promise<void>((resolve) => dialogWaiters.add(resolve));
  }
  return withWindowDialog(win, undefined as never, operation);
}

export async function withWindowDialog<T>(
  win: BrowserWindow | null,
  cancelled: T,
  operation: (owner: BrowserWindow | null) => Promise<T>,
): Promise<T> {
  const owner = win && !win.isDestroyed() ? win : null;
  if (owner) {
    if (activeWindows.has(owner.id)) {
      owner.focus();
      return cancelled;
    }
    const id = owner.id;
    activeWindows.add(id);
    try { return await operation(owner); }
    finally { activeWindows.delete(id); releaseDialogWaiters(); }
  }
  if (appDialogOpen) return cancelled;
  appDialogOpen = true;
  try { return await operation(null); }
  finally { appDialogOpen = false; releaseDialogWaiters(); }
}
