import { useEffect, useRef, type RefObject } from "react";
import type { Page } from "@/types";

type RevealPage = Pick<Page, "id" | "workspaceId" | "parentId" | "trashedAt" | "localUnsaved" | "editorDraft">;

interface SidebarPageRevealOptions {
  activeNotebookId: string | null;
  highlightedPageId: string | null;
  expandPageId: string | null;
  pages: Record<string, RevealPage>;
  expandedIds: string[];
  treeReady: boolean;
  preserveNotebookScroll?: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  setExpanded: (notebookId: string, ids: string[]) => void;
  consumeRequest: (pageId: string) => void;
}

export function useSidebarPageReveal({
  activeNotebookId,
  highlightedPageId,
  expandPageId,
  pages,
  expandedIds,
  treeReady,
  preserveNotebookScroll = false,
  scrollContainerRef,
  setExpanded,
  consumeRequest,
}: SidebarPageRevealOptions) {
  const observed = useRef<{
    notebookId: string | null;
    highlightedId: string | null;
    requestedId: string | null;
  } | null>(null);
  const pending = useRef<{ pageId: string; explicit: boolean } | null>(null);
  const restoringNotebook = useRef(false);

  useEffect(() => {
    const previous = observed.current;
    const pageChanged = !previous || previous.highlightedId !== highlightedPageId;
    const notebookChanged = !previous || previous.notebookId !== activeNotebookId;
    const requestChanged = !previous || previous.requestedId !== expandPageId;
    if (notebookChanged) restoringNotebook.current = preserveNotebookScroll;
    observed.current = {
      notebookId: activeNotebookId,
      highlightedId: highlightedPageId,
      requestedId: expandPageId,
    };

    if (requestChanged && expandPageId) {
      restoringNotebook.current = false;
      pending.current = { pageId: expandPageId, explicit: true };
    } else if (restoringNotebook.current && pending.current?.explicit &&
      pages[pending.current.pageId]?.workspaceId === activeNotebookId) {
      restoringNotebook.current = false;
    } else if (restoringNotebook.current) {
      pending.current = null;
      if (treeReady && highlightedPageId && pages[highlightedPageId]?.workspaceId === activeNotebookId)
        restoringNotebook.current = false;
    } else if (pageChanged || notebookChanged) {
      if ((pageChanged && highlightedPageId) || !pending.current?.explicit) {
        pending.current = highlightedPageId
          ? { pageId: highlightedPageId, explicit: false }
          : null;
      }
    }

    const intent = pending.current;
    if (!intent || !activeNotebookId || !treeReady) return;
    const page = pages[intent.pageId];
    if (!page || page.workspaceId !== activeNotebookId || page.trashedAt || page.localUnsaved || page.editorDraft) return;

    const ancestors: string[] = [];
    const seen = new Set([page.id]);
    let parentId = page.parentId;
    while (parentId) {
      const parent = pages[parentId];
      if (!parent || parent.workspaceId !== activeNotebookId || parent.trashedAt || parent.localUnsaved || seen.has(parentId)) return;
      seen.add(parentId);
      ancestors.push(parentId);
      parentId = parent.parentId;
    }
    const missing = ancestors.filter((id) => !expandedIds.includes(id));
    if (missing.length) {
      setExpanded(activeNotebookId, [...expandedIds, ...missing]);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;
    let cancelled = false;
    let frame: number | null = null;
    const stop = () => {
      cancelled = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
    };
    const reveal = () => {
      frame = null;
      if (cancelled) return;
      const row = Array.from(container.querySelectorAll<HTMLElement>("[data-rct-item-id]"))
        .find((element) => element.getAttribute("data-rct-item-id") === intent.pageId);
      if (!row) return;
      const bounds = container.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      if (!container.clientHeight || !rect.height) return;
      const top = bounds.top + container.clientTop;
      const bottom = top + container.clientHeight;
      const delta = rect.top < top || rect.height > container.clientHeight
        ? rect.top - top
        : rect.bottom > bottom ? rect.bottom - bottom : 0;
      if (delta) container.scrollTop += delta;
      pending.current = null;
      stop();
      if (expandPageId) consumeRequest(expandPageId);
    };
    const schedule = () => {
      if (!cancelled && frame === null) frame = window.requestAnimationFrame(reveal);
    };
    const mutations = new MutationObserver(schedule);
    mutations.observe(container, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(container);
    schedule();
    return stop;
  }, [activeNotebookId, highlightedPageId, expandPageId, pages, expandedIds, treeReady, preserveNotebookScroll, scrollContainerRef, setExpanded, consumeRequest]);
}
