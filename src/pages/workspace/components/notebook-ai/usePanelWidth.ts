import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { startPointerDrag } from "@/lib/interaction/pointerDrag";

const STORAGE_KEY = "thinkly-ai-panel-width";
export const PANEL_WIDTH_MIN = 320;
const DEFAULT_WIDTH = 338;

function clamp(value: number) {
  return Number.isFinite(value) ? Math.max(PANEL_WIDTH_MIN, value) : DEFAULT_WIDTH;
}

export function readPreferredPanelWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw?.trim()) return clamp(Number(raw));
  } catch { /* Keep the session usable when storage is unavailable. */ }
  return DEFAULT_WIDTH;
}

export function usePanelWidth(onWidthPreview: (width: number) => number, disabled = false) {
  const [width, setWidth] = useState(readPreferredPanelWidth);
  const [isResizing, setIsResizing] = useState(false);
  const gestureRef = useRef<ReturnType<typeof startPointerDrag> | null>(null);
  const previewRef = useRef(onWidthPreview);
  useLayoutEffect(() => { previewRef.current = onWidthPreview; }, [onWidthPreview]);

  useEffect(() => () => gestureRef.current?.dispose(), []);
  useEffect(() => {
    if (disabled) gestureRef.current?.finish();
  }, [disabled]);

  const setAndPersist = useCallback((next: number) => {
    const value = clamp(next);
    setWidth(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* Session only. */ }
  }, []);

  const onDragHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>, displayedWidth: number) => {
    if (disabled || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    let pendingWidth = displayedWidth;
    setIsResizing(true);
    gestureRef.current = startPointerDrag({
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX,
      scope: "ai-panel",
      cursor: "col-resize",
      onMove: (clientX) => {
        pendingWidth = previewRef.current(clamp(displayedWidth + startX - clientX));
      },
      onCancel: () => {
        gestureRef.current = null;
        previewRef.current(displayedWidth);
        setIsResizing(false);
      },
      onEnd: () => {
        gestureRef.current = null;
        setAndPersist(pendingWidth);
        setIsResizing(false);
      },
    });
  };

  const onDragHandleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, displayedWidth: number, maxWidth: number) => {
    if (disabled || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const minWidth = Math.min(PANEL_WIDTH_MIN, maxWidth);
    let next: number;
    if (event.key === "Home") next = minWidth;
    else if (event.key === "End") next = maxWidth;
    else if (event.key === "ArrowLeft") next = displayedWidth + 16;
    else if (event.key === "ArrowRight") next = displayedWidth - 16;
    else return;
    event.preventDefault();
    event.stopPropagation();
    setAndPersist(Math.max(minWidth, Math.min(maxWidth, next)));
  };

  return { width, isResizing, setWidth: setAndPersist, onDragHandlePointerDown, onDragHandleKeyDown };
}
