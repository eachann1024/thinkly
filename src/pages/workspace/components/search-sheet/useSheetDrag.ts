import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { startPointerDrag } from "@/lib/interaction/pointerDrag";

/** 拖动位置直接写 DOM，搜索结果列表只在手势开始和结束时更新。 */
export function useSheetDrag(sheetRef: RefObject<HTMLElement | null>, onDismiss: () => void, enabled = true) {
  const gestureRef = useRef<ReturnType<typeof startPointerDrag> | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => gestureRef.current?.dispose(), []);
  useEffect(() => { if (!enabled) gestureRef.current?.cancel(); }, [enabled]);
  return {
    dragging,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        const sheet = sheetRef.current;
        if (!enabled || !sheet || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
        event.preventDefault();
        const startY = event.clientY;
        const height = sheet.offsetHeight;
        let offset = 0;
        const reset = () => {
          gestureRef.current = null;
          sheet.dataset.dragging = "false";
          sheet.style.removeProperty("--search-sheet-drag");
          setDragging(false);
        };
        sheet.dataset.dragging = "true";
        setDragging(true);
        gestureRef.current = startPointerDrag({
          target: event.currentTarget,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY,
          cursor: "grabbing",
          onMove: (_x, y) => {
            offset = Math.max(0, y - startY);
            sheet.style.setProperty("--search-sheet-drag", `${offset}px`);
          },
          onEnd: () => {
            reset();
            if (offset > height * 0.25) onDismiss();
          },
          onCancel: reset,
        });
      },
    },
  };
}
