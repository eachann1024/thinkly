import { flushSync } from "react-dom";

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

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

export function runWithPresence(update: () => void): void {
  startPresence(update, true);
}

export function runDomPresence(update: () => void): void {
  startPresence(update, false);
}
