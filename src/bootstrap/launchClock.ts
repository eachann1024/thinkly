export const LAUNCH_STROKE_MS = 620;
export const LAUNCH_ANIMATION_MS = 1240;
export const LAUNCH_EXIT_MS = 240;
export const LAUNCH_REDUCED_FADE_MS = 120;
export const LAUNCH_APP_READY_CAP_MS = 4000;

export function remainingUntil(anchor: number, duration: number, now: number): number {
  return Math.max(0, anchor + duration - now);
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let mountedAt = 0;
let hasMountedAt = false;
let settled = false;
let settleMounted: (at: number) => void = () => {};
const mounted = new Promise<number>((resolve) => {
  settleMounted = (at) => {
    if (settled) return;
    settled = true;
    resolve(at);
  };
});

export function noteLaunchTraceMounted(at = performance.now()): void {
  if (hasMountedAt) return;
  hasMountedAt = true;
  mountedAt = at;
  settleMounted(at);
}

export function launchTraceMountedAt(fallbackMs = 1000): Promise<number> {
  if (hasMountedAt) return Promise.resolve(mountedAt);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      if (!hasMountedAt) {
        hasMountedAt = true;
        mountedAt = performance.now();
      }
      settleMounted(mountedAt);
    }, fallbackMs);
    void mounted.then((at) => {
      window.clearTimeout(timer);
      resolve(at);
    });
  });
}
