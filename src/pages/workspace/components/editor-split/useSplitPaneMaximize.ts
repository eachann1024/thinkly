import { useEffect, useLayoutEffect, useRef } from "react";
import { OPEN_ESCAPE_LAYER_SELECTOR } from "@/lib/escape-close";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { toggleMaximizePane, useEditorSplit } from "@/stores/useEditorSplit";

const EDITOR_POPOVER_SELECTOR = [
  ".bn-suggestion-menu",
  ".bn-grid-suggestion-menu",
  ".bn-link-toolbar",
  "[data-goose-link-toolbar]",
  "[data-formatting-toolbar]",
  ".bn-panel",
  ".bn-table-handle-menu",
  ".bn-side-menu",
].join(",");

export function isSplitHeaderBlankTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("button, a, input, textarea, select, [role='menu']")) return false;
  if (target.closest(
    ".editor-split-header-title, .editor-split-header-page, .editor-split-header-notebook, .editor-split-notebook-mark",
  )) return false;
  return Boolean(target.closest(".editor-split-header"));
}

function escapeBlocked(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || isImeKeyboardEvent(event)) return true;
  const active = document.activeElement;
  if (active instanceof Element && active.closest(
    `${EDITOR_POPOVER_SELECTOR}, [data-goose-floating-content], [role="menu"], [role="dialog"]`,
  )) return true;
  if (document.querySelector(EDITOR_POPOVER_SELECTOR)) return true;
  if (document.querySelector(OPEN_ESCAPE_LAYER_SELECTOR)) return true;
  if (document.querySelector('.editor-split-surface[data-pane-dragging]')) return true;
  return false;
}

export function useSplitPaneMaximize(tabId: string, leafId: string) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const maximized = useEditorSplit(
    (state) => state.maximizedPaneIdByTab[tabId] === leafId,
  );

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!maximized || !header) return;
    const pane = header.closest<HTMLElement>(".editor-split-pane");
    const surface = header.closest<HTMLElement>(".editor-split-surface");
    if (!pane || !surface) return;

    const touched: { el: HTMLElement; overflow: string }[] = [];
    let node = pane.parentElement;
    while (node && node !== surface) {
      touched.push({ el: node, overflow: node.style.overflow });
      node.style.overflow = "visible";
      node = node.parentElement;
    }
    const panel = pane.parentElement;
    const panelZ = panel?.style.zIndex ?? "";
    if (panel) panel.style.zIndex = "5";
    surface.setAttribute("data-maximized-pane", leafId);
    pane.setAttribute("data-maximized", "true");

    const place = () => {
      const surfaceRect = surface.getBoundingClientRect();
      const origin = pane.offsetParent instanceof HTMLElement ? pane.offsetParent : surface;
      const originRect = origin.getBoundingClientRect();
      pane.style.position = "absolute";
      pane.style.left = `${surfaceRect.left - originRect.left + origin.scrollLeft}px`;
      pane.style.top = `${surfaceRect.top - originRect.top + origin.scrollTop}px`;
      pane.style.width = `${surfaceRect.width}px`;
      pane.style.height = `${surfaceRect.height}px`;
      pane.style.zIndex = "5";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(surface);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      for (const item of touched) item.el.style.overflow = item.overflow;
      if (panel) panel.style.zIndex = panelZ;
      pane.style.position = "";
      pane.style.left = "";
      pane.style.top = "";
      pane.style.width = "";
      pane.style.height = "";
      pane.style.zIndex = "";
      pane.removeAttribute("data-maximized");
      if (surface.getAttribute("data-maximized-pane") === leafId) {
        surface.removeAttribute("data-maximized-pane");
      }
    };
  }, [maximized, leafId]);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      if (escapeBlocked(event)) return;
      event.preventDefault();
      event.stopPropagation();
      toggleMaximizePane(tabId, leafId);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [maximized, tabId, leafId]);

  return headerRef;
}
