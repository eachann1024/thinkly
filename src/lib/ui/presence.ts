import { flushSync } from "react-dom";

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

/** 稳定、合法的 view-transition-name。同类 id 必须唯一。 */
export function presenceName(kind: string, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_-]/g, "") || "item";
  return `goose-${kind}-${safe}`;
}

function canAnimate(): boolean {
  return typeof document !== "undefined"
    && typeof document.startViewTransition === "function"
    && !window.matchMedia(REDUCE_MOTION).matches;
}

function startPresence(update: () => void, flush: boolean): void {
  if (!canAnimate()) {
    update();
    return;
  }
  try {
    document.startViewTransition(() => {
      if (flush) flushSync(update);
      else update();
    });
  } catch {
    update();
  }
}

/** React 状态更新：删除、移动导致的节点消失会淡出，新节点淡入。 */
export function runWithPresence(update: () => void): void {
  startPresence(update, true);
}

/** 编辑器等同步改 DOM 的路径，不经过 React flush。 */
export function runDomPresence(update: () => void): void {
  startPresence(update, false);
}
