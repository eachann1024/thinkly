import type { PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { InlinePreviewPart } from "./inlinePreview";
import { groupInlinePreviewRanges } from "./inlinePreviewRange";

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
    const parts = key.getState(view.state) ?? [];
    if (!parts.length) return;
    const hostRect = host.getBoundingClientRect();
    const scaleX = hostRect.width / (host.offsetWidth || hostRect.width || 1);
    const scaleY = hostRect.height / (host.offsetHeight || hostRect.height || 1);
    const bounds = horizontalBounds(host);
    const offsetX = host.scrollLeft - host.clientLeft;
    const offsetY = host.scrollTop - host.clientTop;
    const styles: Array<{ left: string; top: string; width: string; height: string }> = [];
    for (const group of groupInlinePreviewRanges(view.state.doc, parts)) {
      const rects = group.flatMap((part) => {
        const element = view.nodeDOM(part.blockFrom);
        return element instanceof HTMLElement ? [element.getBoundingClientRect()] : [];
      }).filter((rect) => rect.width > 0 && rect.height > 0);
      if (!rects.length) continue;
      const left = Math.max(Math.min(...rects.map((rect) => rect.left)) - 5 * scaleX, bounds.left + scaleX);
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.min(Math.max(...rects.map((rect) => rect.right)) + 5 * scaleX, bounds.right - scaleX);
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      if (right <= left) continue;
      styles.push({
        left: `${(left - hostRect.left) / scaleX + offsetX}px`,
        top: `${(top - hostRect.top) / scaleY + offsetY - 4}px`,
        width: `${(right - left) / scaleX}px`,
        height: `${(bottom - top) / scaleY + 8}px`,
      });
    }
    styles.forEach((style, index) => {
      const outline = layer.children[index] as HTMLElement | undefined ?? view.dom.ownerDocument.createElement("div");
      if (!outline.parentElement) {
        outline.className = "goose-ai-range-outline";
        layer.append(outline);
      }
      Object.assign(outline.style, style);
    });
    while (layer.children.length > styles.length) layer.lastElementChild?.remove();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const observer = new ResizeObserver(schedule);
  let listening = false;
  const detach = () => {
    listening = false;
    cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    view.dom.ownerDocument.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
  };
  const update = () => {
    if (!(key.getState(view.state)?.length)) {
      if (listening) detach();
      if (layer.childElementCount) layer.replaceChildren();
      return;
    }
    if (!listening) {
      listening = true;
      observer.observe(view.dom);
      observer.observe(host);
      view.dom.ownerDocument.addEventListener("scroll", schedule, true);
      window.addEventListener("resize", schedule);
    }
    schedule();
  };
  update();
  return {
    update,
    destroy() {
      detach();
      layer.remove();
      host.classList.remove("goose-ai-range-host");
    },
  };
}
