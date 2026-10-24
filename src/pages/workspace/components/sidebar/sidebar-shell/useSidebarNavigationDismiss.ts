import { useEffect, useRef, useState } from "react";
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import type { useSidebarLifecycle } from "./useSidebarLifecycle";
import { hasSidebarFloatingInteraction, hasSidebarInteraction } from "./sidebarInteraction";

type PointerOrigin = { x: number; y: number; at: number; pageId: string };

export function useSidebarNavigationDismiss(
  input: ReturnType<typeof useSidebarLifecycle>,
  dismiss: () => void,
) {
  const { sidebarRef, sidebarCollapsed, activePageId, outlinePageId, activeNotebookId, currentView } = input;
  const [pending, setPending] = useState<{ pageId: string; notebookId: string | null } | null>(null);
  const origin = useRef<PointerOrigin | null>(null);
  const guard = useRef<PointerOrigin | null>(null);
  const consumeClick = useRef(false);
  const lastKey = useRef<string | null>(null);
  const latest = useRef({ activePageId, outlinePageId, activeNotebookId, dismiss });
  latest.current = { activePageId, outlinePageId, activeNotebookId, dismiss };
  const complete = (pageId: string | null) => {
    const vp = useWorkspaceViewport.getState();
    if (!vp.forceCollapseLeft || !vp.leftExpandOverride || hasSidebarFloatingInteraction() ||
      (pageId && hasSidebarInteraction(sidebarRef.current))) return;
    const pointer = origin.current;
    if (pageId && pointer?.pageId === pageId && performance.now() - pointer.at < 450)
      guard.current = pointer;
    latest.current.dismiss();
    if (!pageId) return;
    requestAnimationFrame(() => {
      const surface = document.querySelector('[data-focused="true"][data-pane-id]') ??
        document.querySelector(".workspace-main-sheet");
      surface?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      lastKey.current = event.key;
      setPending(null);
    };
    const onKeyUp = () => { lastKey.current = null; };
    const onPointerDown = (event: PointerEvent) => {
      lastKey.current = null;
      setPending(null);
      const target = event.target;
      if (!(target instanceof Element)) return;
      const previous = guard.current;
      guard.current = null;
      if (previous && event.pointerType === "mouse" && event.button === 0 &&
        target.closest(".workspace-main-sheet") &&
        performance.now() - previous.at < 450 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6) {
        event.preventDefault();
        event.stopImmediatePropagation();
        consumeClick.current = true;
        openPageFromSidebar(previous.pageId, "permanent");
        return;
      }
      consumeClick.current = false;
      const row = target.closest<HTMLElement>("[data-rct-item-id]");
      origin.current = event.pointerType === "mouse" && row && sidebarRef.current?.contains(row)
        ? { x: event.clientX, y: event.clientY, at: performance.now(), pageId: row.dataset.rctItemId ?? "" }
        : null;
    };
    const onClick = (event: MouseEvent) => {
      if (!consumeClick.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      consumeClick.current = false;
    };
    const onNavigation = (event: Event) => {
      const vp = useWorkspaceViewport.getState();
      if (!vp.forceCollapseLeft || !vp.leftExpandOverride) return;
      if (lastKey.current === "ArrowUp" || lastKey.current === "ArrowDown") return;
      const pageId = (event as CustomEvent<{ pageId?: string }>).detail?.pageId ?? null;
      if (!pageId || latest.current.activePageId === pageId || latest.current.outlinePageId === pageId) {
        setPending(null);
        complete(pageId);
      } else setPending({ pageId, notebookId: latest.current.activeNotebookId });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("goose-note:sidebar-navigation-complete", onNavigation);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("goose-note:sidebar-navigation-complete", onNavigation);
    };
  }, [sidebarRef]);
  useEffect(() => {
    if (!pending || pending.notebookId !== activeNotebookId ||
      (activePageId !== pending.pageId && outlinePageId !== pending.pageId)) return;
    setPending(null);
    complete(pending.pageId);
  }, [pending, activePageId, outlinePageId, activeNotebookId]);
  useEffect(() => { setPending(null); }, [sidebarCollapsed, activeNotebookId, currentView]);
}
