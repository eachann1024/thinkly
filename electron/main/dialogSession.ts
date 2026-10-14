import type { BrowserWindow } from "electron";

const activeWindows = new Set<number>();

/** Duplicate requests are cancelled, not joined: two consumers must not import
 * the same selection twice or mistake another dialog's result for their own. */
export async function withWindowDialog<T>(
  win: BrowserWindow | null,
  cancelled: T,
  operation: (owner: BrowserWindow) => Promise<T>,
): Promise<T> {
  if (!win || win.isDestroyed()) return cancelled;
  if (activeWindows.has(win.id)) {
    win.focus();
    return cancelled;
  }
  const id = win.id;
  activeWindows.add(id);
  try { return await operation(win); }
  finally { activeWindows.delete(id); }
}
