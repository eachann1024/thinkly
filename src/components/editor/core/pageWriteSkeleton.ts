import type { EditorView } from "@tiptap/pm/view";
import "./pageWriteSkeleton.css";

const COVER_MS = 780;
const HOLD_MS = 720;
const LIFT_MS = 960;
const BLOCKED_EVENTS = ["beforeinput", "paste", "cut", "drop", "keydown"];

function scrollerOf(node: HTMLElement): HTMLElement {
  for (let el: HTMLElement | null = node.parentElement; el; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll")) return el;
  }
  return node.parentElement!;
}

interface BarBox { left: number; top: number; width: number; height: number; radius?: number; rule?: boolean }

// A virtual page: title, headings, a table and paragraphs with comfortable rhythm.
// It never mirrors real content, so nothing of the page (borders, media, margins) can leak through.
function virtualBars(view: EditorView, area: DOMRect): BarBox[] {
  const style = getComputedStyle(view.dom);
  const rect = view.dom.getBoundingClientRect();
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  const left = Math.max(rect.left - area.left + padL, 16);
  const width = Math.max(Math.min(rect.width - padL - padR, area.width - left - 16), 160);
  const bars: BarBox[] = [];
  let y = 56;
  const bar = (x: number, w: number, h: number, top = y, radius?: number) =>
    bars.push({ left: left + x, top, width: w, height: h, radius });
  const heading = (w: number) => { bar(0, width * w, 16, y + 8); y += 32 + 22; };
  const paragraph = (lines: number) => {
    for (let i = 0; i < lines; i++) {
      bar(0, width * (i === lines - 1 ? 0.58 : i === 1 ? 0.93 : 1), 8, y + 9);
      y += 28;
    }
    y += 24;
  };
  const table = (rows: number, cols: number) => {
    const cell = width / cols;
    for (let r = 0; r < rows; r++) {
      const head = r === 0;
      for (let c = 0; c < cols; c++) bar(c * cell + 18, cell * (head ? 0.32 : 0.2 + ((r * 3 + c * 5) % 4) * 0.12), 8, y + 22);
      y += 52;
      bars.push({ left, top: y, width, height: 1, rule: true });
    }
    bars.push({ left, top: y - rows * 52, width, height: 1, rule: true });
    y += 44;
  };
  bar(0, width * 0.46, 32, y, 8);
  y += 32 + 40;
  heading(0.22);
  table(5, 3);
  heading(0.26);
  paragraph(3);
  paragraph(2);
  heading(0.2);
  table(4, 2);
  paragraph(3);
  return bars.filter((spec) => spec.top < area.height);
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

  const oldOpacity = view.dom.style.opacity;
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
    const bars = virtualBars(view, box).map((spec) => {
      const bar = document.createElement("span");
      bar.className = spec.rule ? "goose-page-write-rule" : "goose-skeleton goose-page-write-bar";
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
    view.dom.style.opacity = oldOpacity;
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
    view.dom.style.opacity = oldOpacity;
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
    view.dom.style.opacity = "0";
    return lift;
  } catch {
    dispose();
    return () => {};
  }
}
