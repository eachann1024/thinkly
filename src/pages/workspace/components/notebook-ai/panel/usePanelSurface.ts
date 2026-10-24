import { isPointerDragActive } from "@/lib/interaction/pointerDrag";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePanelWidth } from "../usePanelWidth";
import { isSidebarResizeDrag } from "../../sidebar/hooks/useSidebarResize";
import {
  readSidebarAiLiveWidth,
  SIDEBAR_EDITOR_RESERVE,
  useSidebarAiSqueeze,
} from "../../sidebar/sidebar-shell/sidebarAiSqueeze";
import type { ComposerHandle } from "../Composer";
import { readEditorScale } from "../artifactPanZoomScale";
import { EDITOR_UI_SCALE_CHANGE_EVENT } from "@/lib/appearance";
import {
  clearAiPanelSurface,
  dismissAiFloatingLayers,
  setAiPanelSurface,
} from "../aiPanelSurface";
export function usePanelSurface(
  isFullscreen: boolean,
  isElectronChrome: boolean,
) {
  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const availableWidthRef = useRef(Number.POSITIVE_INFINITY);
  const previewWidth = useCallback((nextWidth: number) => {
    const root = panelRootRef.current;
    const next = Math.min(nextWidth, availableWidthRef.current);
    if (root) {
      root.style.width = `${next}px`;
      root.closest<HTMLElement>(".workspace-shell")?.style.setProperty("--workspace-ai-width", `${next}px`);
    }
    return next;
  }, []);
  const { width, isResizing, onDragHandlePointerDown, onDragHandleKeyDown } =
    usePanelWidth(previewWidth, isFullscreen);
  const squeezeWidth = useSidebarAiSqueeze((s) => s.width);
  const dragWidth = isSidebarResizeDrag() ? readSidebarAiLiveWidth() : null;
  const widthCap = dragWidth ?? squeezeWidth;
  const [maxWidth, setMaxWidth] = useState(width);
  const composerDockRef = useRef<HTMLDivElement | null>(null);
  const [fittedWidth, setEffectiveWidth] = useState(width);
  const effectiveWidth = widthCap == null ? fittedWidth : Math.min(fittedWidth, widthCap);
  const composerRef = useRef<ComposerHandle | null>(null);
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    const root = panelRootRef.current;
    setAiPanelSurface({ active: true, fullscreen: isFullscreen });
    return () => {
      clearAiPanelSurface();
      dismissAiFloatingLayers(root);
    };
  }, [isFullscreen]);

  useEffect(() => {
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        setBodyReady(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, []);

  useLayoutEffect(() => {
    if (isFullscreen) return;
    const root = panelRootRef.current;
    const parent = root?.parentElement;
    if (!parent) return;

    const recompute = () => {
      const parentW = parent.clientWidth;
      const stage = root.closest(".workspace-stage");
      const sidebarVisible = stage && !stage.hasAttribute("data-sidebar-collapsed") &&
        !stage.hasAttribute("data-sidebar-overlay") && !stage.closest("[data-settings]");
      const room = parentW - (sidebarVisible ? SIDEBAR_EDITOR_RESERVE : 200);
      const availableRoom = room > 0 ? room : Math.max(0, parentW);
      availableWidthRef.current = availableRoom;
      if (isSidebarResizeDrag() || isPointerDragActive("ai-panel")) return;
      setMaxWidth(availableRoom);
      const cap = useSidebarAiSqueeze.getState().width;
      const next = Math.min(width, availableRoom, cap ?? Number.POSITIVE_INFINITY);
      setEffectiveWidth(next);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [isFullscreen, width, squeezeWidth]);

  useLayoutEffect(() => {
    if (isFullscreen || !isElectronChrome) return;
    const shell =
      panelRootRef.current?.closest<HTMLElement>(".workspace-shell");
    shell?.style.setProperty("--workspace-ai-width", `${effectiveWidth}px`);
    return () => {
      shell?.style.removeProperty("--workspace-ai-width");
    };
  }, [effectiveWidth, isElectronChrome, isFullscreen]);

  useLayoutEffect(() => {
    const dock = composerDockRef.current;
    const panel = panelRootRef.current;
    if (!dock || !panel) return;

    const sync = () => {
      const scale = readEditorScale(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--editor-scale",
        ),
      );
      panel.style.setProperty(
        "--ai-composer-float-pad",
        `${dock.offsetHeight / scale}px`,
      );
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dock);
    window.addEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, sync);
    return () => {
      ro.disconnect();
      window.removeEventListener(EDITOR_UI_SCALE_CHANGE_EVENT, sync);
      panel.style.removeProperty("--ai-composer-float-pad");
    };
  }, []);
  return {
    width,
    isResizing,
    maxWidth,
    onDragHandleKeyDown,
    onDragHandlePointerDown,
    panelRootRef,
    composerDockRef,
    effectiveWidth,
    composerRef,
    bodyReady,
  };
}
export type PanelSurfaceState = ReturnType<typeof usePanelSurface>;
