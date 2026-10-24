import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { startPointerDrag } from "@/lib/interaction/pointerDrag";

export const SIDEBAR_MIN_WIDTH = 160;
const SIDEBAR_DEFAULT_WIDTH = SIDEBAR_MIN_WIDTH;
export const SIDEBAR_MAX_WIDTH = 480;

let sidebarResizeDragActive = false;

export function isSidebarResizeDrag() {
  return sidebarResizeDragActive;
}

export function resolveSidebarWidth(
  saved: string | null,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
) {
  const value = saved?.trim() ? Number(saved) : NaN;
  return Number.isFinite(value) && value > 0
    ? Math.max(minWidth, Math.min(SIDEBAR_MAX_WIDTH, value))
    : defaultWidth;
}

export function resolveSidebarOverlayWidth(width: number, viewportWidth: number) {
  return Math.min(width, Math.max(0, viewportWidth - 56));
}

export function clampSidebarResizeWidth(
  width: number,
  maxWidth = SIDEBAR_MAX_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
) {
  return Math.max(Math.min(minWidth, maxWidth), Math.min(maxWidth, width));
}

export function resolveSidebarKeyboardWidth(
  width: number,
  key: string,
  disabled = false,
  maxWidth = SIDEBAR_MAX_WIDTH,
  minWidth = SIDEBAR_MIN_WIDTH,
): number | null {
  if (disabled) return null;
  if (key === "Home") return Math.min(minWidth, maxWidth);
  if (key === "End") return maxWidth;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;
  const currentWidth = clampSidebarResizeWidth(width, maxWidth, minWidth);
  return clampSidebarResizeWidth(
    currentWidth + (key === "ArrowLeft" ? -16 : 16),
    maxWidth,
    minWidth,
  );
}

interface UseSidebarResizeOptions {
  disableResize?: boolean;
  defaultWidth?: number;
  storageKey?: string;
  maxWidth?: number;
  minWidth?: number;
  onWidthPreview: (width: number) => void;
}

export function useSidebarResize({
  disableResize = false,
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  storageKey = "sidebar-width",
  maxWidth = SIDEBAR_MAX_WIDTH,
  minWidth: configuredMinWidth = SIDEBAR_MIN_WIDTH,
  onWidthPreview,
}: UseSidebarResizeOptions) {
  const [preferredWidth, setWidth] = useState(() => {
    try {
      return resolveSidebarWidth(localStorage.getItem(storageKey), defaultWidth, configuredMinWidth);
    } catch {
      return defaultWidth;
    }
  });
  const minWidth = Math.min(configuredMinWidth, maxWidth);
  const width = clampSidebarResizeWidth(preferredWidth, maxWidth, minWidth);
  const [isResizing, setIsResizing] = useState(false);
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const activeStopRef = useRef<(() => void) | null>(null);
  const previewRef = useRef(onWidthPreview);

  useLayoutEffect(() => {
    previewRef.current = onWidthPreview;
    activeStopRef.current?.();
  }, [disableResize, minWidth, maxWidth, onWidthPreview]);

  useEffect(
    () => () => {
      sidebarResizeDragActive = false;
      activeCleanupRef.current?.();
      activeCleanupRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, String(preferredWidth));
      } catch {
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [preferredWidth, storageKey]);

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disableResize || event.button !== 0 || !event.isPrimary || activeCleanupRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    sidebarResizeDragActive = true;
    setIsResizing(true);
    const startX = event.clientX;
    const startWidth = width;
    let pendingWidth = width;
    const gesture = startPointerDrag({
      target: event.currentTarget,
      pointerId: event.pointerId,
      startX,
      cursor: "col-resize",
      onMove: (clientX) => {
        pendingWidth = clampSidebarResizeWidth(startWidth + clientX - startX, maxWidth, minWidth);
        previewRef.current(pendingWidth);
      },
      onCancel: () => {
        activeCleanupRef.current = activeStopRef.current = null;
        sidebarResizeDragActive = false;
        previewRef.current(startWidth);
        setIsResizing(false);
      },
      onEnd: () => {
        activeCleanupRef.current = null;
        activeStopRef.current = null;
        sidebarResizeDragActive = false;
        setWidth(pendingWidth);
        setIsResizing(false);
      },
    });
    activeCleanupRef.current = gesture.dispose;
    activeStopRef.current = gesture.finish;
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const nextWidth = resolveSidebarKeyboardWidth(width, event.key, disableResize, maxWidth, minWidth);
    if (nextWidth === null) return;
    event.preventDefault();
    event.stopPropagation();
    setWidth(nextWidth);
  };

  return {
    width,
    minWidth,
    maxWidth,
    isResizing,
    handleResizePointerDown,
    handleResizeKeyDown,
  };
}
