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
    const transition = document.startViewTransition(() => {
      if (flush) flushSync(update);
      else update();
    });
    // Overlapping transitions reject with "Transition was skipped"; the update still runs.
    const ignore = () => {};
    transition.ready.catch(ignore);
    transition.finished.catch(ignore);
  } catch {
    update();
  }
}

export function runWithPresence(update: () => void): void {
  startPresence(update, true);
}
