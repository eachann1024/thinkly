import { useRef, useState, type PointerEvent, type RefObject } from "react";

/** 拖动把手下拉面板，超过高度 25% 时关闭，否则回弹。 */
export function useSheetDrag(sheetRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const start = useRef<{ y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const end = (event: PointerEvent<HTMLElement>, cancel = false) => {
    if (!start.current || start.current.id !== event.pointerId) return;
    const height = sheetRef.current?.offsetHeight ?? 1;
    const delta = Math.max(0, event.clientY - start.current.y);
    start.current = null;
    setDragging(false);
    setOffset(0);
    if (!cancel && delta > height * 0.25) onDismiss();
  };
  return {
    offset, dragging,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || !event.isPrimary) return;
        start.current = { y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (start.current?.id === event.pointerId) setOffset(Math.max(0, event.clientY - start.current.y));
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => end(event),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => end(event, true),
    },
  };
}
