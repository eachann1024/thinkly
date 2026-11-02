import type { EditorView } from "@tiptap/pm/view";
import "./pageWriteSkeleton.css";

const COVER_MS = 780;
const HOLD_MS = 720;
const LIFT_MS = 960;
const MAX_BARS = 400;
const BLOCKED_EVENTS = ["beforeinput", "paste", "cut", "drop", "keydown"];

function scrollerOf(node: HTMLElement): HTMLElement {
  for (let el: HTMLElement | null = node.parentElement; el; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
  }
  return node.parentElement!;
}

function barRects(view: EditorView, area: DOMRect): DOMRect[] {
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(view.dom, NodeFilter.SHOW_TEXT);
  let text: Node | null;
  while ((text = walker.nextNode()) && rects.length < MAX_BARS) {
    if (!text.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width > 0 && rect.bottom > area.top && rect.top < area.bottom) rects.push(rect);
    }
  }
  for (const media of view.dom.querySelectorAll("img, video, audio, iframe, hr")) {
    const rect = media.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > area.top && rect.top < area.bottom) rects.push(rect);
  }
  return rects;
}

function revealBlocks(view: EditorView, area: DOMRect) {
  const group = view.dom.querySelector(".bn-block-group");
  const blocks = group ? Array.from(group.children) as HTMLElement[] : [];
  for (const block of blocks) {
    const fraction = (block.getBoundingClientRect().top - area.top) / (area.height || 1);
    block.style.setProperty("--goose-write-delay", `${Math.round(Math.min(Math.max(fraction, 0), 1) * 560)}ms`);
  }
  view.dom.classList.add("goose-page-write-reveal");
  return () => {
    view.dom.classList.remove("goose-page-write-reveal");
    for (const block of blocks) block.style.removeProperty("--goose-write-delay");
  };
}

/**
 * Covers the whole editor viewport with a page-shaped skeleton while an AI write is applied.
 * The returned promise resolves once the curtain is down; calling the result lifts it.
 */
export async function showPageWriteSkeleton(view: EditorView, signal: AbortSignal): Promise<() => void> {
  if (!view.dom.isConnected || signal.aborted) return () => {};
  const scroller = scrollerOf(view.dom);
  const host = scroller.parentElement!;
  const oldPosition = host.style.position;
  const positionHost = getComputedStyle(host).position === "static";
  if (positionHost) host.style.position = "relative";

  const overlay = document.createElement("div");
  overlay.className = "goose-page-write-overlay";
  overlay.dataset.phase = "cover";
  overlay.setAttribute("aria-hidden", "true");
  const scan = document.createElement("div");
  scan.className = "goose-page-write-scan";
  overlay.append(scan);
  host.append(overlay);

  const oldBusy = view.dom.getAttribute("aria-busy");
  view.dom.setAttribute("aria-busy", "true");
  const preventEdit = (event: Event) => event.preventDefault();
  for (const name of BLOCKED_EVENTS) view.dom.addEventListener(name, preventEdit, true);

  let disposed = false;
  let drawn: HTMLElement | null = null;
  let frame = 0;
  let liftTimer = 0;
  let undoReveal = () => {};
  const place = () => {
    const hostBox = host.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    Object.assign(overlay.style, {
      left: `${box.left - hostBox.left + host.scrollLeft}px`,
      top: `${box.top - hostBox.top + host.scrollTop}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    return box;
  };
  const draw = () => {
    if (disposed || !view.dom.isConnected) return;
    const box = place();
    const bars = barRects(view, box).map((rect) => {
      const bar = document.createElement("span");
      bar.className = "goose-skeleton goose-page-write-bar";
      const height = rect.height > 30 ? rect.height * 0.5 : 8;
      Object.assign(bar.style, {
        left: `${rect.left - box.left}px`,
        top: `${rect.top - box.top + (rect.height - height) / 2}px`,
        width: `${rect.width}px`,
        height: `${height}px`,
      });
      return bar;
    });
    const layer = document.createElement("div");
    layer.className = "goose-page-write-bars";
    layer.append(...bars);
    drawn?.replaceWith(layer);
    if (!drawn) overlay.append(layer);
    drawn = layer;
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      try { draw(); } catch { dispose(); }
    });
  };
  const teardown = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    clearTimeout(liftTimer);
    undoReveal();
    overlay.remove();
    if (positionHost && host.style.position === "relative") host.style.position = oldPosition;
    observer.disconnect();
    scroller.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    signal.removeEventListener("abort", dispose);
  };
  const unblock = () => {
    if (oldBusy === null) view.dom.removeAttribute("aria-busy");
    else view.dom.setAttribute("aria-busy", oldBusy);
    for (const name of BLOCKED_EVENTS) view.dom.removeEventListener(name, preventEdit, true);
  };
  function dispose() {
    if (disposed) return;
    unblock();
    teardown();
  }
  const lift = () => {
    if (disposed) return;
    unblock();
    if (!view.dom.isConnected || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      teardown();
      return;
    }
    undoReveal = revealBlocks(view, scroller.getBoundingClientRect());
    overlay.dataset.phase = "reveal";
    liftTimer = window.setTimeout(teardown, LIFT_MS + 160);
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(scroller);
  observer.observe(view.dom);
  scroller.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  signal.addEventListener("abort", dispose, { once: true });
  try {
    draw();
    await new Promise((resolve) => setTimeout(resolve, COVER_MS + HOLD_MS));
    if (disposed) return () => {};
    overlay.dataset.phase = "hold";
    return lift;
  } catch {
    dispose();
    return () => {};
  }
}
