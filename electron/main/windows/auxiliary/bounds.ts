import { app, BrowserWindow, type BrowserWindow as Win } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  clampBoundsToWorkArea,
  type WindowBounds,
} from "../../windowLayout";
import { workAreaNear } from "../layout";

type StoredBounds = { x: number; y: number; width: number; height: number };
type Size = { width: number; height: number };

let cache: Record<string, StoredBounds> | null = null;
let timer: NodeJS.Timeout | null = null;
const pending = new Map<string, StoredBounds>();

function boundsPath(): string {
  return path.join(app.getPath("userData"), "auxiliary-window-bounds.json");
}

function readAll(): Record<string, StoredBounds> {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(readFileSync(boundsPath(), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) cache = {};
    else cache = parsed as Record<string, StoredBounds>;
  } catch {
    cache = {};
  }
  return cache;
}

function flush(): void {
  timer = null;
  const all = readAll();
  for (const [key, bounds] of pending) all[key] = bounds;
  pending.clear();
  try {
    mkdirSync(app.getPath("userData"), { recursive: true });
    writeFileSync(boundsPath(), JSON.stringify(all));
  } catch {
    // Bounds are a convenience. A failed write must not take the window down.
  }
}

export function readAuxiliaryBounds(key: string): StoredBounds | null {
  const stored = pending.get(key) ?? readAll()[key];
  if (!stored) return null;
  const { x, y, width, height } = stored;
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return null;
  return { x, y, width, height };
}

export function scheduleAuxiliaryBounds(key: string, bounds: StoredBounds): void {
  pending.set(key, bounds);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 300);
  timer.unref();
}

export function readNormalBounds(win: Win): StoredBounds | null {
  if (win.isDestroyed()) return null;
  try {
    const raw = (win.isMaximized() || win.isFullScreen()) && typeof win.getNormalBounds === "function"
      ? win.getNormalBounds()
      : win.getBounds();
    return { x: raw.x, y: raw.y, width: raw.width, height: raw.height };
  } catch {
    return null;
  }
}

export function clampAuxiliaryBox(
  bounds: WindowBounds,
  min: Size,
): WindowBounds {
  return clampBoundsToWorkArea(bounds, workAreaNear({ x: bounds.x, y: bounds.y }), min);
}

export function clampLiveWindow(win: BrowserWindow, min: Size): void {
  if (win.isDestroyed() || win.isMaximized() || win.isFullScreen()) return;
  try {
    const next = clampAuxiliaryBox(win.getBounds(), min);
    const current = win.getBounds();
    if (current.x === next.x && current.y === next.y && current.width === next.width && current.height === next.height) return;
    win.setBounds(next);
  } catch {
    // The display list can change under us. The next show clamps again.
  }
}
