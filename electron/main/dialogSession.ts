import { BrowserWindow } from "electron";

const activeWindows = new Set<number>();
let appDialogOpen = false;

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
    finally { activeWindows.delete(id); }
  }
  if (appDialogOpen) return cancelled;
  appDialogOpen = true;
  try { return await operation(null); }
  finally { appDialogOpen = false; }
}
