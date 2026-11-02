import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { sizedBlocksKey } from "./tableSizedDecorations";

function scrollParent(node: HTMLElement): HTMLElement {
  let element = node.parentElement;
  while (element && element !== document.body) {
    const overflow = getComputedStyle(element).overflowY;
    if (overflow === "auto" || overflow === "scroll") return element;
    element = element.parentElement;
  }
  return document.scrollingElement as HTMLElement ?? document.documentElement;
}

export function observeWindowTables(
  view: EditorView,
  measure: (scroller: HTMLElement, tables: ReadonlyMap<HTMLElement, number>) => void,
) {
  let frame = 0;
  let parent = view.dom.parentElement;
  let scroller = scrollParent(view.dom);
  const tables = new Map<HTMLElement, number>();
  const candidates = new Map<HTMLElement, number>();
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      if (!view.isDestroyed && candidates.size) measure(scroller, candidates);
    });
  };
  const createObserver = () => typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const pos = tables.get(element);
      if (entry.isIntersecting && pos != null) candidates.set(element, pos);
      else candidates.delete(element);
    }
    schedule();
  }, { root: scroller === document.scrollingElement ? null : scroller, rootMargin: "1200px 0px" });
  let observer = createObserver();
  const refresh = () => {
    if (parent !== view.dom.parentElement || !scroller.contains(view.dom)) {
      parent = view.dom.parentElement;
      const next = scrollParent(view.dom);
      if (next !== scroller) {
        scroller.removeEventListener("scroll", schedule);
        scroller = next;
        scroller.addEventListener("scroll", schedule, { passive: true });
        observer?.disconnect();
        observer = createObserver();
        tables.clear();
        candidates.clear();
      }
    }
    const next = new Map<HTMLElement, number>();
    for (const decoration of sizedBlocksKey.getState(view.state)?.find(undefined, undefined, spec => spec.table) ?? []) {
      const pos = decoration.from + 1;
      const element = view.nodeDOM(pos);
      if (!(element instanceof HTMLElement)) continue;
      next.set(element, pos);
      if (!tables.has(element)) observer?.observe(element);
      if (!observer || candidates.has(element)) candidates.set(element, pos);
    }
    for (const element of tables.keys()) {
      if (next.has(element)) continue;
      observer?.unobserve(element);
      candidates.delete(element);
    }
    tables.clear();
    for (const [element, pos] of next) tables.set(element, pos);
    schedule();
  };
  const resize = () => { refresh(); };
  scroller.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", resize);
  refresh();
  return {
    update(_view: EditorView, previous: EditorState) {
      if (view.state.doc !== previous.doc) refresh();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", resize);
    },
  };
}
