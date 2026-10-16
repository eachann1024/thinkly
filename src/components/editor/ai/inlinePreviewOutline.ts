import type { PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { InlinePreviewPart } from "./inlinePreview";
import { groupInlinePreviewRanges } from "./inlinePreviewRange";

/** Keep both vertical edges inside the editor and any horizontal clipping ancestor. */
function horizontalBounds(host: HTMLElement) {
  const bounds = host.getBoundingClientRect();
  let left = bounds.left;
  let right = bounds.right;
  for (let parent: HTMLElement | null = host; parent; parent = parent.parentElement) {
    if (!/^(auto|scroll|hidden|clip)$/.test(getComputedStyle(parent).overflowX)) continue;
    const rect = parent.getBoundingClientRect();
    const scale = rect.width / (parent.offsetWidth || rect.width || 1);
    left = Math.max(left, rect.left + parent.clientLeft * scale);
    right = Math.min(right, rect.left + (parent.clientLeft + parent.clientWidth) * scale);
  }
  return { left, right };
}

/** A sibling layer keeps the outline out of ProseMirror's editable document. */
export function createInlinePreviewOutline(view: EditorView, key: PluginKey<InlinePreviewPart[]>) {
  const host = view.dom.parentElement;
  if (!host) return { update() {}, destroy() {} };
  const layer = view.dom.ownerDocument.createElement("div");
  layer.className = "goose-ai-range-layer";
  layer.setAttribute("aria-hidden", "true");
  host.classList.add("goose-ai-range-host");
  host.append(layer);
  let frame = 0;
  const paint = () => {
    frame = 0;
    if (view.isDestroyed || !view.dom.isConnected) return;
    const hostRect = host.getBoundingClientRect();
    const scaleX = hostRect.width / (host.offsetWidth || hostRect.width || 1);
    const scaleY = hostRect.height / (host.offsetHeight || hostRect.height || 1);
    const bounds = horizontalBounds(host);
    let index = 0;
    for (const group of groupInlinePreviewRanges(view.state.doc, key.getState(view.state) ?? [])) {
      const rects = group.flatMap((part) => {
        const element = view.nodeDOM(part.blockFrom);
        return element instanceof HTMLElement ? [element.getBoundingClientRect()] : [];
      }).filter((rect) => rect.width > 0 && rect.height > 0);
      if (!rects.length) continue;
      // Preserve the outset where there is room, but never draw an edge outside the clip.
      const left = Math.max(Math.min(...rects.map((rect) => rect.left)) - 5 * scaleX, bounds.left + scaleX);
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.min(Math.max(...rects.map((rect) => rect.right)) + 5 * scaleX, bounds.right - scaleX);
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      if (right <= left) continue;
      const outline = layer.children[index] as HTMLElement | undefined ?? view.dom.ownerDocument.createElement("div");
      if (!outline.parentElement) {
        outline.className = "goose-ai-range-outline";
        layer.append(outline);
      }
      Object.assign(outline.style, {
        left: `${(left - hostRect.left) / scaleX + host.scrollLeft - host.clientLeft}px`,
        top: `${(top - hostRect.top) / scaleY + host.scrollTop - host.clientTop - 4}px`,
        width: `${(right - left) / scaleX}px`,
        height: `${(bottom - top) / scaleY + 8}px`,
      });
      index++;
    }
    while (layer.children.length > index) layer.lastElementChild?.remove();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const observer = new ResizeObserver(schedule);
  observer.observe(view.dom);
  observer.observe(host);
  view.dom.ownerDocument.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  schedule();
  return {
    update: schedule,
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      view.dom.ownerDocument.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      layer.remove();
      host.classList.remove("goose-ai-range-host");
    },
  };
}
