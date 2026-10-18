import { BrowserWindow } from "electron";
import { appQuitting } from "./registry";
import { windowState } from "./state";

/** 隐藏后才回收的浮动小窗（速记、搜索）共用的空闲销毁计时器。 */
export type IdleDestroyTimerKey = "quicknoteDestroyTimer" | "searchDestroyTimer";

export function clearIdleDestroyTimer(key: IdleDestroyTimerKey): void {
  const timer = windowState[key];
  if (!timer) return;
  clearTimeout(timer);
  windowState[key] = null;
}

export function scheduleIdleDestroy(
  win: BrowserWindow,
  key: IdleDestroyTimerKey,
  delayMs: number,
): void {
  clearIdleDestroyTimer(key);
  if (win.isDestroyed() || appQuitting()) return;
  const timer = setTimeout(() => {
    windowState[key] = null;
    if (appQuitting() || win.isDestroyed() || win.isVisible()) return;
    win.destroy();
  }, delayMs);
  timer.unref();
  windowState[key] = timer;
}
