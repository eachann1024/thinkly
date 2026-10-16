import { screen, type BrowserWindow, type Rectangle } from "electron";
import { schedulePersistLayout } from "./layout";

const transitions = new WeakMap<BrowserWindow, Promise<void>>();

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

async function resizeWelcomeWindow(win: BrowserWindow, reducedMotion: boolean): Promise<void> {
  if (win.isFullScreen()) {
    await leaveWindowMode(win, "leave-full-screen", () => win.setFullScreen(false));
  }
  if (win.isDestroyed()) return;
  if (win.isMaximized()) {
    await leaveWindowMode(win, "unmaximize", () => win.unmaximize());
  }
  if (win.isDestroyed()) return;

  const start = win.getBounds();
  const area = screen.getDisplayMatching(start).workArea;
  const scale = Math.min(1, area.width / 1920, area.height / 1080);
  const [minWidth, minHeight] = win.getMinimumSize();
  const width = Math.min(area.width, Math.max(minWidth, Math.round(1920 * scale)));
  const height = Math.min(area.height, Math.max(minHeight, Math.round(1080 * scale)));
  const target: Rectangle = {
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    width,
    height,
  };
  if (reducedMotion) {
    win.setBounds(target);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const startedAt = performance.now();
    const tick = () => {
      if (win.isDestroyed()) {
        resolve();
        return;
      }
      const progress = Math.min(1, (performance.now() - startedAt) / 600);
      const eased = 1 - Math.pow(1 - progress, 3);
      const interpolate = (key: keyof Rectangle) =>
        Math.round(start[key] + (target[key] - start[key]) * eased);
      try {
        win.setBounds({
          x: interpolate("x"),
          y: interpolate("y"),
          width: interpolate("width"),
          height: interpolate("height"),
        });
      } catch (error) {
        reject(error);
        return;
      }
      if (progress === 1) resolve();
      else setTimeout(tick, 16);
    };
    tick();
  });
}

/** Resolve only after the welcome window has reached its presentation bounds. */
export function prepareWelcomeWindow(win: BrowserWindow, reducedMotion: boolean): Promise<void> {
  const pending = transitions.get(win);
  if (pending) return pending;
  const transition = resizeWelcomeWindow(win, reducedMotion)
    .then(() => {
      if (!win.isDestroyed()) schedulePersistLayout();
    })
    .finally(() => {
      transitions.delete(win);
    });
  transitions.set(win, transition);
  return transition;
}
