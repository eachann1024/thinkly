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
    if ((overflowY === "auto" || overflowY === "scroll")) return el;
  }
  return node.parentElement!;
}

const SOLID_TYPES = new Set(["image", "video", "audio", "file", "table", "codeBlock", "embed"]);

interface BarBox { left: number; top: number; width: number; height: number; radius?: number }

// One block-shaped placeholder per top-level block, so the cover reads as a page, not as inline text.
function blockBars(view: EditorView, area: DOMRect): BarBox[] {
  const group = view.dom.querySelector(".bn-block-group");
  const bars: BarBox[] = [];
  for (const block of Array.from(group?.children ?? []) as HTMLElement[]) {
    const rect = block.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom < area.top || rect.top > area.bottom) continue;
    const type = block.querySelector("[data-content-type]")?.getAttribute("data-content-type") ?? "paragraph";
    const left = rect.left - area.left;
    const top = rect.top - area.top;
    if (SOLID_TYPES.has(type)) {
      bars.push({ left, top: top + 4, width: rect.width, height: Math.max(rect.height - 8, 12), radius: 8 });
    } else if (type === "heading") {
      bars.push({ left, top: top + (rect.height - 16) / 2, width: rect.width * 0.34, height: 16 });
    } else {
      const lines = Math.max(1, Math.round(rect.height / 26));
      const inset = type.endsWith("ListItem") ? 22 : 0;
      for (let i = 0; i < lines && bars.length < MAX_BARS; i++) {
        const last = i === lines - 1 && lines > 1;
        bars.push({
          left: left + inset,
          top: top + i * 26 + 9,
          width: (rect.width - inset) * (last ? 0.58 : lines === 1 ? 0.72 : 1),
          height: 8,
        });
      }
    }
  }
  return bars;
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
    const bars = blockBars(view, box).map((spec) => {
      const bar = document.createElement("span");
      bar.className = "goose-skeleton goose-page-write-bar";
      Object.assign(bar.style, {
        left: `${spec.left}px`,
        top: `${spec.top}px`,
        width: `${spec.width}px`,
        height: `${spec.height}px`,
        ...(spec.radius ? { borderRadius: `${spec.radius}px` } : {}),
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
