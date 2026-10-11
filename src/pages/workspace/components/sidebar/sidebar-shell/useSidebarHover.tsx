import { useCallback, useEffect, useRef } from "react";
import { useSidebarView } from "@/stores/useSidebarView";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import {
  hasSidebarFloatingInteraction,
  hasSidebarInteraction,
} from "./sidebarInteraction";
import type { SidebarView } from "./shared";
import type { useSidebarLifecycle } from "./useSidebarLifecycle";

export function useSidebarHover(input: ReturnType<typeof useSidebarLifecycle>) {
  const {
    sidebarRef,
    sidebarModeRailRef,
    sidebarCollapsed,
    sidebarOverlay,
    settingsOpen,
    currentView,
    inHistoryMode,
    switchSidebarView,
    handleOpenSearch,
    closeSidebarOverlay,
  } = input;
  const mode = useWorkspaceViewport((s) => s.leftPanelMode);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDown = useRef(false);
  const pointerInside = useRef(false);
  const keepSidebarOpen = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
    pointerInside.current = true;
  }, []);
  const pinned = !sidebarCollapsed && (!sidebarOverlay || mode === "pinned");
  const openSidebarView = (view: SidebarView) => {
    keepSidebarOpen();
    if (!pinned || settingsOpen)
      useWorkspaceViewport.getState().openLeftPanel("engaged");
    if (view === "search") handleOpenSearch();
    else switchSidebarView(view);
  };
  const hoverSidebarView = (view: SidebarView) => {
    keepSidebarOpen();
    if (
      settingsOpen ||
      inHistoryMode ||
      pinned ||
      (mode === "engaged" && !sidebarCollapsed) ||
      (currentView === "search" && !sidebarCollapsed) ||
      hasSidebarInteraction(sidebarRef.current)
    )
      return;
    if (view === "search") return;
    openTimer.current = setTimeout(() => {
      useWorkspaceViewport.getState().openLeftPanel("preview");
      switchSidebarView(view);
    }, 200);
  };
  const leaveSidebar = useCallback(() => {
    pointerInside.current = false;
    if (openTimer.current) clearTimeout(openTimer.current);
    const attempt = () => {
      const vp = useWorkspaceViewport.getState();
      if (
        pointerInside.current ||
        vp.leftPanelMode !== "preview" ||
        !vp.leftExpandOverride
      )
        return;
      if (pointerDown.current || hasSidebarInteraction(sidebarRef.current)) {
        closeTimer.current = setTimeout(attempt, 350);
        return;
      }
      closeSidebarOverlay();
    };
    closeTimer.current = setTimeout(attempt, 350);
  }, [closeSidebarOverlay, sidebarRef]);
  const toggleSidebarPin = () => {
    keepSidebarOpen();
    if (pinned) {
      useSidebarView.getState().setSidebarCollapsed(true);
      useWorkspaceViewport.getState().openLeftPanel("engaged");
    } else {
      useSidebarView.getState().setSidebarCollapsed(false);
      useWorkspaceViewport.getState().openLeftPanel("pinned");
    }
  };
  const dismissAfterNavigation = useCallback(() => {
    const vp = useWorkspaceViewport.getState();
    if (!settingsOpen && vp.leftExpandOverride && vp.leftPanelMode !== "pinned")
      closeSidebarOverlay();
  }, [settingsOpen, closeSidebarOverlay]);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (sidebarRef.current?.contains(target)) {
        pointerDown.current = true;
        if (useWorkspaceViewport.getState().leftPanelMode === "preview")
          useWorkspaceViewport.getState().openLeftPanel("engaged");
      }
      // 正文的第一次点击仍正常交给编辑器，关闭浮层不阻断选区和输入。
      if (
        target.closest(".workspace-main-sheet") &&
        !hasSidebarFloatingInteraction()
      ) {
        const vp = useWorkspaceViewport.getState();
        if (vp.leftExpandOverride && vp.leftPanelMode !== "pinned")
          closeSidebarOverlay();
      }
    };
    const release = () => {
      pointerDown.current = false;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", release);
    window.addEventListener(
      "goose-note:sidebar-navigation-complete",
      dismissAfterNavigation,
    );
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", release);
      window.removeEventListener(
        "goose-note:sidebar-navigation-complete",
        dismissAfterNavigation,
      );
    };
  }, [
    closeSidebarOverlay,
    dismissAfterNavigation,
    mode,
    sidebarRef,
    sidebarModeRailRef,
  ]);
  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  return {
    ...input,
    pinned,
    mode,
    keepSidebarOpen,
    leaveSidebar,
    hoverSidebarView,
    openSidebarView,
    toggleSidebarPin,
    dismissAfterNavigation,
  };
}
