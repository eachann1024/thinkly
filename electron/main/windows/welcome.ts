import { screen, type BrowserWindow, type Event } from "electron";
import { welcomePresentationBounds, type Rect } from "../../../src/lib/electron/welcomeWindow";
import { schedulePersistLayout } from "./layout";

const transitions = new WeakMap<BrowserWindow, Promise<void>>();
const generations = new WeakMap<BrowserWindow, number>();

type HeldChrome = {
  resizable: boolean;
  maximizable: boolean;
  fullScreenable: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
};

const heldChrome = new WeakMap<BrowserWindow, HeldChrome>();

function bumpGeneration(win: BrowserWindow): number {
  const next = (generations.get(win) ?? 0) + 1;
  generations.set(win, next);
  return next;
}

function isCurrent(win: BrowserWindow, token: number): boolean {
  return generations.get(win) === token && !win.isDestroyed();
}

function blockResize(event: Event): void {
  event.preventDefault();
}

function enqueue(win: BrowserWindow, task: () => Promise<void> | void): Promise<void> {
  const previous = transitions.get(win) ?? Promise.resolve();
  const current = previous.then(() => task(), () => task());
  transitions.set(win, current);
  void current.finally(() => {
    if (transitions.get(win) === current) transitions.delete(win);
  });
  return current;
}

function holdWelcomeChrome(win: BrowserWindow): void {
  if (win.isDestroyed() || heldChrome.has(win)) return;
  const [minWidth, minHeight] = win.getMinimumSize();
  const [maxWidth, maxHeight] = win.getMaximumSize();
  heldChrome.set(win, {
    resizable: win.isResizable(),
    maximizable: win.isMaximizable(),
    fullScreenable: win.isFullScreenable(),
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  });
  win.setMinimumSize(1, 1);
  win.setMaximumSize(16000, 16000);
  win.setResizable(false);
  win.setMaximizable(false);
  win.setFullScreenable(false);
  win.on("will-resize", blockResize);
}

function pinWelcomeSize(win: BrowserWindow, width: number, height: number): void {
  if (win.isDestroyed()) return;
  holdWelcomeChrome(win);
  win.setMaximumSize(width, height);
  win.setMinimumSize(width, height);
  win.setSize(width, height);
}

function releaseWelcomeChrome(win: BrowserWindow): void {
  const saved = heldChrome.get(win);
  heldChrome.delete(win);
  if (!saved || win.isDestroyed()) return;
  win.removeListener("will-resize", blockResize);
  win.setMaximumSize(saved.maxWidth, saved.maxHeight);
  win.setMinimumSize(saved.minWidth, saved.minHeight);
  win.setFullScreenable(saved.fullScreenable);
  win.setMaximizable(saved.maximizable);
  win.setResizable(saved.resizable);
}

function leaveWindowMode(
  win: BrowserWindow,
  event: "leave-full-screen" | "unmaximize",
  change: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      win.removeListener(event, complete);
      win.removeListener("closed", closed);
      if (error) reject(error);
      else resolve();
    };
    const complete = () => finish();
    const closed = () => finish(new Error("Welcome window was closed"));
    const timeout = setTimeout(
      () => finish(new Error("Welcome window could not leave its current mode")),
      2500,
    );
    win.once(event, complete);
    win.once("closed", closed);
    try {
      change();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function animateBounds(win: BrowserWindow, _start: Rect, target: Rect, token: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isCurrent(win, token)) {
      resolve();
      return;
    }
    // 一次系统动画。逐帧 setBounds 会在视网膜屏上叠出约 1GB 的 IOSurface。
    try {
      win.setBounds(target, true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    setTimeout(resolve, 250);
  });
}

async function resizeWelcomeWindow(win: BrowserWindow, reducedMotion: boolean, token: number): Promise<void> {
  const start = win.getBounds();
  const target = welcomePresentationBounds(screen.getDisplayMatching(start).workArea);
  holdWelcomeChrome(win);
  if (!isCurrent(win, token)) return;
  if (win.isFullScreen()) {
    await leaveWindowMode(win, "leave-full-screen", () => win.setFullScreen(false));
  }
  if (!isCurrent(win, token)) return;
  if (win.isMaximized()) {
    await leaveWindowMode(win, "unmaximize", () => win.unmaximize());
  }
  if (!isCurrent(win, token)) return;
  if (reducedMotion) win.setBounds(target);
  else await animateBounds(win, start, target, token);
  if (!isCurrent(win, token)) return;
  pinWelcomeSize(win, target.width, target.height);
}

/** Resolve only after the welcome window has reached its presentation bounds. */
export function prepareWelcomeWindow(win: BrowserWindow, reducedMotion: boolean): Promise<void> {
  const token = bumpGeneration(win);
  return enqueue(win, async () => {
    if (!isCurrent(win, token)) return;
    await resizeWelcomeWindow(win, reducedMotion, token);
    if (!isCurrent(win, token)) return;
    schedulePersistLayout();
  });
}

/** Restore dragging after the welcome animation leaves the screen. */
export function restoreWelcomeWindow(win: BrowserWindow): Promise<void> {
  bumpGeneration(win);
  return enqueue(win, () => {
    releaseWelcomeChrome(win);
  });
}
