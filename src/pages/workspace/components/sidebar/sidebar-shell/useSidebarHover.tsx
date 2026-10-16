import { useCallback, useEffect, useRef } from "react";
import { useSidebarView } from "@/stores/useSidebarView";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { hasSidebarInteraction } from "./sidebarInteraction";
import { useSidebarNavigationDismiss } from "./useSidebarNavigationDismiss";
import type { SidebarView } from "./shared";
import type { useSidebarLifecycle } from "./useSidebarLifecycle";

export function useSidebarHover(input: ReturnType<typeof useSidebarLifecycle>) {
  const {
    sidebarRef, sidebarCollapsed, forceCollapseLeft,
    settingsOpen, currentView, inHistoryMode, switchSidebarView,
    handleOpenSearch, closeSidebarOverlay,
  } = input;
  const mode = useWorkspaceViewport((s) => s.leftPanelMode);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDown = useRef(false);
  const pointerInside = useRef(false);
  const composing = useRef(false);
  const cancelTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  }, []);
  const keepSidebarOpen = useCallback(() => {
    cancelTimers();
    pointerInside.current = true;
  }, [cancelTimers]);
  const focusSidebar = (view: SidebarView) => {
    requestAnimationFrame(() => {
      if (view === "search") return; // 搜索会话负责聚焦输入框。
      sidebarRef.current?.querySelector<HTMLElement>(
        view === "pages"
          ? '.sidebar-notebook-trigger, [role="tree"] [tabindex="0"], button'
          : 'button, [tabindex="0"]',
      )?.focus({ preventScroll: true });
    });
  };
  const openSidebarView = (view: SidebarView, keyboard = false) => {
    keepSidebarOpen();
    const preview = forceCollapseLeft && mode === "preview";
    if (!sidebarCollapsed && currentView === view && !settingsOpen && !inHistoryMode && !preview) {
      closeSidebarOverlay();
      return;
    }
    useSidebarView.getState().openSidebarPanel("engaged");
    if (view === "search") handleOpenSearch();
    else switchSidebarView(view);
    if (keyboard) focusSidebar(view);
  };
  const hoverSidebarView = (view: SidebarView) => {
    keepSidebarOpen();
    const blocked = () => {
      const vp = useWorkspaceViewport.getState();
      return !vp.forceCollapseLeft || settingsOpen || inHistoryMode ||
        composing.current || pointerDown.current ||
        (vp.leftPanelMode === "engaged" && vp.leftExpandOverride) ||
        (currentView === "search" && vp.leftExpandOverride) ||
        hasSidebarInteraction(sidebarRef.current);
    };
    if (view === "search" || blocked()) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      if (blocked() || !pointerInside.current) return;
      useWorkspaceViewport.getState().openLeftPanel("preview");
      switchSidebarView(view);
    }, 200);
  };
  const leaveSidebar = useCallback(() => {
    pointerInside.current = false;
    cancelTimers();
    const attempt = () => {
      const vp = useWorkspaceViewport.getState();
      if (pointerInside.current || !vp.forceCollapseLeft ||
        vp.leftPanelMode !== "preview" || !vp.leftExpandOverride) return;
      if (pointerDown.current || composing.current || hasSidebarInteraction(sidebarRef.current)) {
        closeTimer.current = setTimeout(attempt, 350);
        return;
      }
      closeSidebarOverlay();
    };
    closeTimer.current = setTimeout(attempt, 350);
  }, [cancelTimers, closeSidebarOverlay, sidebarRef]);
  const dismissAfterNavigation = useCallback(() => {
    const vp = useWorkspaceViewport.getState();
    if (!settingsOpen && vp.forceCollapseLeft && vp.leftExpandOverride) {
      cancelTimers();
      closeSidebarOverlay();
    }
  }, [settingsOpen, cancelTimers, closeSidebarOverlay]);
  useSidebarNavigationDismiss(input, dismissAfterNavigation);
  useEffect(() => {
    const engage = () => {
      const vp = useWorkspaceViewport.getState();
      if (vp.forceCollapseLeft && vp.leftExpandOverride && vp.leftPanelMode === "preview")
        vp.openLeftPanel("engaged");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      pointerDown.current = event.button === 0;
      if (sidebarRef.current?.contains(event.target)) {
        engage();
      } else if (event.target.closest(".workspace-main-sheet")) {
        // 不取消正文的第一次点击，浮层和菜单在同一次手势内收起。
        dismissAfterNavigation();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && sidebarRef.current?.contains(event.target)) {
        cancelTimers();
        engage();
      }
    };
    const release = () => { pointerDown.current = false; };
    const onBlur = () => {
      release();
      composing.current = false;
      cancelTimers();
      const vp = useWorkspaceViewport.getState();
      if (vp.leftPanelMode === "preview") dismissAfterNavigation();
    };
    const compositionStart = () => { composing.current = true; cancelTimers(); };
    const compositionEnd = () => { composing.current = false; };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("compositionstart", compositionStart, true);
    document.addEventListener("compositionend", compositionEnd, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("compositionstart", compositionStart, true);
      document.removeEventListener("compositionend", compositionEnd, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [cancelTimers, dismissAfterNavigation, sidebarRef]);
  useEffect(() => {
    cancelTimers();
  }, [forceCollapseLeft, settingsOpen, inHistoryMode, currentView, input.activeNotebookId, cancelTimers]);
  useEffect(() => cancelTimers, [cancelTimers]);
  return {
    ...input, mode, keepSidebarOpen, leaveSidebar, hoverSidebarView,
    openSidebarView, dismissAfterNavigation,
  };
}
