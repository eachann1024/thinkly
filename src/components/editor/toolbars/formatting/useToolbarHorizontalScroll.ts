import { useEffect, useRef } from "react";

export function useToolbarHorizontalScroll(enabled: boolean) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!enabled || !row) return;

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey) return;
      if (row.scrollWidth <= row.clientWidth) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? parseFloat(getComputedStyle(row).lineHeight) || 32
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? row.clientWidth : 1;
      event.preventDefault();
      row.scrollLeft += event.deltaY * unit;
    };

    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, [enabled]);

  return rowRef;
}
