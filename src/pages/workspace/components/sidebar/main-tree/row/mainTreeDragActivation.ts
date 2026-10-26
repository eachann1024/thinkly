import type { PointerEvent } from "react";

const HOLD_DURATION_MS = 150;
const pressTimes = new WeakMap<HTMLElement, number>();

function clearPress(event: PointerEvent<HTMLElement>) {
  pressTimes.delete(event.currentTarget);
}

export const mainTreeDragPressProps = {
  onPointerDownCapture(event: PointerEvent<HTMLElement>) {
    clearPress(event);
    if (event.isPrimary && event.button === 0) {
      pressTimes.set(event.currentTarget, performance.now());
    }
  },
  onPointerUpCapture: clearPress,
  onPointerCancelCapture: clearPress,
};

export function consumeMainTreeDragPress(element: HTMLElement): boolean {
  const pressedAt = pressTimes.get(element);
  pressTimes.delete(element);
  return (
    pressedAt !== undefined &&
    performance.now() - pressedAt >= HOLD_DURATION_MS
  );
}
