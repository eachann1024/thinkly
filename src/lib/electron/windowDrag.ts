import { getGooseDesktop } from "./runtime";

export const TITLE_WINDOW_DRAG_THRESHOLD_PX = 4;
export const WINDOW_DRAGGING_CLASS = "window-dragging";
export const OPTION_WINDOW_DRAG_CLASS = "option-window-drag";

export function bindOptionWindowDrag(): () => void {
  const root = document.documentElement;
  const syncKey = (event: KeyboardEvent) => {
    if (root.classList.contains(WINDOW_DRAGGING_CLASS)) return;
    root.classList.toggle(OPTION_WINDOW_DRAG_CLASS, event.altKey);
  };
  const syncPointer = (event: PointerEvent) => {
    if (event.buttons !== 0) return;
    root.classList.toggle(OPTION_WINDOW_DRAG_CLASS, event.altKey);
  };
  const clear = () => root.classList.remove(OPTION_WINDOW_DRAG_CLASS);
  window.addEventListener("keydown", syncKey);
  window.addEventListener("keyup", syncKey);
  window.addEventListener("pointermove", syncPointer);
  window.addEventListener("blur", clear);
  return () => {
    window.removeEventListener("keydown", syncKey);
    window.removeEventListener("keyup", syncKey);
    window.removeEventListener("pointermove", syncPointer);
    window.removeEventListener("blur", clear);
    clear();
  };
}

function setWindowDraggingCursor(on: boolean): void {
  const root =
    typeof document === "undefined" ? null : document.documentElement;
  root?.classList.toggle(WINDOW_DRAGGING_CLASS, on);
}

export type WindowPoint = { x: number; y: number };

export function shouldStartWindowDrag(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  thresholdPx = TITLE_WINDOW_DRAG_THRESHOLD_PX,
): boolean {
  const dx = currentX - startX;
  const dy = currentY - startY;
  return dx * dx + dy * dy >= thresholdPx * thresholdPx;
}

export function computeWindowDragOrigin(
  windowOrigin: WindowPoint,
  pressScreen: WindowPoint,
  currentScreen: WindowPoint,
): WindowPoint {
  return {
    x: windowOrigin.x + (currentScreen.x - pressScreen.x),
    y: windowOrigin.y + (currentScreen.y - pressScreen.y),
  };
}

export async function startWindowDragging(): Promise<void> {
  setWindowDraggingCursor(true);
  await getGooseDesktop()?.startWindowDrag?.();
}

export async function endWindowDragging(): Promise<void> {
  setWindowDraggingCursor(false);
  await getGooseDesktop()?.endWindowDrag?.();
}

type IdleDragPointer = {
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: {
    setPointerCapture?: (pointerId: number) => void;
  };
};

export function bindIdleWindowDrag(
  event: IdleDragPointer,
  startedRef: { current: boolean },
): void {
  if (event.button !== 0) return;
  startedRef.current = false;
  event.currentTarget.setPointerCapture?.(event.pointerId);

  const startX = event.clientX;
  const startY = event.clientY;

  const onMove = (ev: PointerEvent) => {
    if (startedRef.current) return;
    if (!shouldStartWindowDrag(startX, startY, ev.clientX, ev.clientY)) return;
    startedRef.current = true;
    window.removeEventListener("pointermove", onMove);
    void startWindowDragging();
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (startedRef.current) void endWindowDragging();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
