import { isStandaloneFile } from "@/lib/standaloneFileCapabilities";
import { activateWorkspace } from "@/lib/settings-navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useTabs, type TabItem } from "@/stores/useTabs";
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from "@dnd-kit/core";
import { useSidebarView } from "@/stores/useSidebarView";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { cancelTabDragPreview, createDesktopWindow, finishTabDrag, previewTabDrag, tabToSnapshot } from "@/lib/electron/windowContext";
import { canDragTabBetweenWindows, tabDragEnabled } from "@/lib/electron/tabTearOff";
import { formatShortcut } from "@/lib/utils";
import { isTabRailTitleFieldTarget } from "../tabRailLayout";
import { useTabDocking } from "../useTabDocking";
import { listVisibleWorkspaceTabs } from "../visibleTabs";
import { useEditorSplitSelector } from "@/stores/useEditorSplit";
import { focusedPageIdOf } from "@/lib/editor-split/tree";
import { detachTabFromThisWindow } from "@/lib/electron/detachTab";
import { collectTabPageIds } from "@/stores/tabs/helpers";
import { isUnsavedEditorPage } from "@/lib/unsavedLocalPage";

import type { TabRailProps } from "./types";
import { sameFocusedPageMap, readDragPointer } from "./model";

function cursorFromEvent(event: Event | undefined) {
  const pointer = readDragPointer(event);
  return pointer ? {
    x: pointer.screenX, y: pointer.screenY,
    clientX: pointer.clientX, clientY: pointer.clientY,
  } : null;
}

export function useTabRail({ variant, onBeforeActivateTab }: Pick<TabRailProps, "variant" | "onBeforeActivateTab">) {
  const pages = usePages((s) => s.pages);
  const getPage = (id: string) => pages[id];
  const activeNotebookId = useNotebooks((state) => state.activeNotebookId);
  const {
    openTabs,
    activeTabId,
    setActiveTab,
    closeTab,
    reorderTabs,
    promotePreviewTab,
    syncNotebookForPage,
  } = useTabs();
  const setExpandPageId = usePages((s) => s.setExpandPageId);
  const setSidebarCollapsedView = useSidebarView((s) => s.setSidebarCollapsed);
  const locateInTree = (pageId: string) => {
    activateWorkspace();
    setSidebarCollapsedView(false);
    syncNotebookForPage(pageId);
    setExpandPageId(pageId);
  };
  const { closeTabShortcut } = useSettings();
  const visibleTabs = listVisibleWorkspaceTabs(
    openTabs,
    getPage,
    activeNotebookId,
  );
  const focusedPageByTabId = useEditorSplitSelector((state) => {
    const next: Record<string, string> = {};
    for (const tab of openTabs) {
      if (tab.type === "welcome" || tab.type === "notebook-ai") continue;
      const split = state.byTabId[tab.id];
      const pageId = split ? focusedPageIdOf(split) : null;
      if (pageId) next[tab.id] = pageId;
    }
    return next;
  }, sameFocusedPageMap);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const tabsScrollerRef = useRef<HTMLDivElement>(null);
  const lastCursorRef = useRef<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const nativePointerRef = useRef<PointerEvent | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const grabOffsetXRef = useRef(80);
  const previewFrameRef = useRef(0);
  const canDockTabs = canDragTabBetweenWindows({
    isElectron: isElectronRuntime(),
    variant,
  });
  const canTransferTab = (tab: TabItem) =>
    tab.type === "welcome" || tab.type === "notebook-ai" ||
    collectTabPageIds(tab).every((id) => {
      const page = usePages.getState().getPage(id);
      return Boolean(page && !isUnsavedEditorPage(page) && !isStandaloneFile(page));
    });
  const dragEnabled = tabDragEnabled({
    isElectron: isElectronRuntime(),
    variant,
    tabCount: visibleTabs.length,
  });
  const { insertLeft } = useTabDocking({
    enabled: canDockTabs,
    scrollerRef: tabsScrollerRef,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      nativePointerRef.current = event;
      if (lastCursorRef.current && event.pointerId === activePointerIdRef.current) {
        lastCursorRef.current = cursorFromEvent(event);
      }
    };
    document.addEventListener("pointermove", trackPointer, true);
    document.addEventListener("pointerup", trackPointer, true);
    return () => {
      document.removeEventListener("pointermove", trackPointer, true);
      document.removeEventListener("pointerup", trackPointer, true);
    };
  }, []);
  const pointerInsideSourceWindow = (cursor: {
    clientX: number;
    clientY: number;
  }) =>
    cursor.clientX >= -8 &&
    cursor.clientY >= -8 &&
    cursor.clientX <= window.innerWidth + 8 &&
    cursor.clientY <= window.innerHeight + 8;
  const handleTabDragStart = (event: DragStartEvent) => {
    activateWorkspace();
    const latest = nativePointerRef.current;
    const activator = event.activatorEvent as PointerEvent;
    activePointerIdRef.current = activator.pointerId;
    lastCursorRef.current = cursorFromEvent(latest?.pointerId === activator.pointerId ? latest : activator);
    const pointer = readDragPointer(event.activatorEvent);
    const el = document.querySelector<HTMLElement>(
      `[data-tab-id="${String(event.active.id)}"]`,
    );
    if (el && pointer) {
      grabOffsetXRef.current = pointer.clientX - el.getBoundingClientRect().left;
    }
  };
  const handleTabDragMove = (event: DragMoveEvent) => {
    const cursor = lastCursorRef.current;
    const tab = openTabs.find((item) => item.id === event.active.id);
    if (!canDockTabs || !tab || !canTransferTab(tab) || !cursor || pointerInsideSourceWindow(cursor)) return;
    if (previewFrameRef.current) return;
    previewFrameRef.current = window.requestAnimationFrame(() => {
      previewFrameRef.current = 0;
      const latest = lastCursorRef.current;
      if (!latest || pointerInsideSourceWindow(latest)) return;
      previewTabDrag(latest);
    });
  };
  const handleTabDragCancel = () => {
    activePointerIdRef.current = null;
    lastCursorRef.current = null;
    if (previewFrameRef.current) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = 0;
    }
    if (canDockTabs) cancelTabDragPreview();
  };
  const reorderFromEvent = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = openTabs.findIndex((tab) => tab.id === active.id);
    const to = openTabs.findIndex((tab) => tab.id === over.id);
    if (from === -1 || to === -1) return;
    reorderTabs(from, to);
  };
  const handleTabDragEnd = (event: DragEndEvent) => {
    activePointerIdRef.current = null;
    const cursor = lastCursorRef.current;
    lastCursorRef.current = null;
    if (previewFrameRef.current) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = 0;
    }
    const tab = openTabs.find((item) => item.id === event.active.id);
    const stayInside =
      !canDockTabs ||
      !tab ||
      !canTransferTab(tab) ||
      !cursor ||
      pointerInsideSourceWindow(cursor);
    if (stayInside) {
      if (canDockTabs) cancelTabDragPreview();
      reorderFromEvent(event);
      return;
    }
    void (async () => {
      const result = await finishTabDrag({
        tab: tabToSnapshot(tab),
        cursor,
        sourceTabCount: visibleTabs.length,
        grabOffsetX: grabOffsetXRef.current,
      });
      if (result.action === "none" || (result.action === "tearOff" && !result.windowId)) {
        reorderFromEvent(event);
        return;
      }
      detachTabFromThisWindow(tab.id, result.windowId);
    })();
  };
  const closeTabShortcutLabel = closeTabShortcut
    ? formatShortcut(closeTabShortcut)
    : isElectronRuntime()
      ? formatShortcut("Mod+W")
      : "";
  const canOpenInNewWindow = (tab: TabItem) => isElectronRuntime() && canTransferTab(tab);
  const visibleTabOrder = JSON.stringify(visibleTabs.map((tab) => tab.id));

  useEffect(() => {
    const scroller = tabsScrollerRef.current;
    if (!scroller) return;
    const scrollActiveIntoView = () => {
      scroller
        .querySelector<HTMLElement>('[data-tab-active="true"]')
        ?.scrollIntoView({ inline: "nearest", block: "nearest" });
      setIsOverflowing(scroller.scrollWidth > scroller.clientWidth);
    };
    scrollActiveIntoView();
    const observer = new ResizeObserver(scrollActiveIntoView);
    observer.observe(scroller);
    scroller.querySelectorAll<HTMLElement>("[data-tab-id]").forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [activeTabId, visibleTabOrder]);

  useEffect(() => {
    const scroller = tabsScrollerRef.current;
    if (!scroller) return;
    const handleWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientWidth : 1);
      scroller.scrollLeft += delta;
      event.preventDefault();
    };
    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, []);

  const handleTabListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (isTabRailTitleFieldTarget(event.target)) return;
    if (visibleTabs.length < 2) return;
    const currentIndex = visibleTabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex === -1) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + delta + visibleTabs.length) % visibleTabs.length;
    const nextTab = visibleTabs[nextIndex];
    if (!nextTab) return;
    event.preventDefault();
    onBeforeActivateTab?.();
    setActiveTab(nextTab.id);
    requestAnimationFrame(() => {
      tabsScrollerRef.current
        ?.querySelector<HTMLElement>(`[data-tab-id="${nextTab.id}"]`)
        ?.focus();
    });
  };

  const openTabInNewWindow = async (tab: TabItem) => {
    if (!canOpenInNewWindow(tab)) return;
    activateWorkspace();
    const created = await createDesktopWindow({
      mode: "currentTab",
      tab: {
        id: tab.id,
        pageId: tab.pageId,
        type: tab.type,
        workspaceId: tab.workspaceId,
      },
    });
    if (created?.windowId) detachTabFromThisWindow(tab.id, created.windowId);
  };

  return {
    visibleTabs, focusedPageByTabId, getPage,
    activeTabId, isOverflowing, tabsScrollerRef,
    dragEnabled, insertLeft, sensors,
    handleTabDragStart, handleTabDragMove, handleTabDragCancel,
    handleTabDragEnd, closeTabShortcutLabel,
    canOpenInNewWindow, setActiveTab, closeTab,
    promotePreviewTab, locateInTree,
    openTabInNewWindow, handleTabListKeyDown,
    openTabs,
  };
}
