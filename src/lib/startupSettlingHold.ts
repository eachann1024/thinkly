// While the launch overlay covers the app, the first paint must not re-enable
// transitions. App still calls releaseStartupSettlingAfterPaint; that call
// reports readiness instead of clearing the attribute.

let held = false;
let notify: (() => void) | null = null;

export function holdStartupSettling(onReady: () => void): void {
  held = true;
  notify = onReady;
}

export function consumeStartupSettlingHold(): boolean {
  if (!held) return false;
  const ready = notify;
  notify = null;
  ready?.();
  return true;
}

export function endStartupSettlingHold(): void {
  held = false;
  notify = null;
}
