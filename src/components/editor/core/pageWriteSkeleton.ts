import type { Node } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import "./pageWriteSkeleton.css";

function changedRanges(before: Node, after: Node, offset = 0): [number, number][] {
  if (before.eq(after)) return [];
  if (before.sameMarkup(after) && before.childCount === after.childCount && !before.isText) {
    const ranges: [number, number][] = [];
    before.forEach((child, pos, index) => {
      ranges.push(...changedRanges(child, after.child(index), offset + pos + (before.type.name === "doc" ? 0 : 1)));
    });
    return ranges;
  }
  if (before.isText && after.isText && before.sameMarkup(after)) {
    const oldText = before.text ?? "";
    const newText = after.text ?? "";
    let start = 0;
    let end = oldText.length;
    let newEnd = newText.length;
    while (start < end && start < newEnd && oldText[start] === newText[start]) start++;
    while (end > start && newEnd > start && oldText[end - 1] === newText[newEnd - 1]) { end--; newEnd--; }
    return [[offset + start, offset + end]];
  }
  const start = before.content.findDiffStart(after.content);
  const end = before.content.findDiffEnd(after.content);
  if (start !== null && end && !before.isLeaf) {
    const base = offset + (before.type.name === "doc" ? 0 : 1);
    return [[base + start, base + Math.max(start, end.a)]];
  }
  return [[offset, offset + before.nodeSize]];
}

export async function showPageWriteSkeleton(view: EditorView, next: Node, signal: AbortSignal): Promise<() => void> {
  const ranges = changedRanges(view.state.doc, next);
  if (!ranges.length || !view.dom.isConnected) return () => {};
  const host = view.dom.closest<HTMLElement>(".page-scroll-container") ?? view.dom.parentElement!;
  const overlay = document.createElement("div");
  overlay.className = "goose-page-write-skeleton";
  overlay.setAttribute("aria-hidden", "true");
  host.append(overlay);
  const oldBusy = view.dom.getAttribute("aria-busy");
  view.dom.setAttribute("aria-busy", "true");
  const preventEdit = (event: Event) => event.preventDefault();
  for (const event of ["beforeinput", "paste", "cut", "drop", "keydown"]) view.dom.addEventListener(event, preventEdit, true);
  let disposed = false;
  const draw = () => {
    if (disposed || !view.dom.isConnected) return;
    const bounds = host.getBoundingClientRect();
    const pieces: HTMLElement[] = [];
    for (const [from, to] of ranges) {
      const a = view.domAtPos(Math.min(from, view.state.doc.content.size));
      const b = view.domAtPos(Math.min(to, view.state.doc.content.size));
      const range = document.createRange();
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      const rects: DOMRect[] = [];
      const walker = document.createTreeWalker(view.dom, NodeFilter.SHOW_TEXT);
      let text: globalThis.Node | null;
      while ((text = walker.nextNode())) {
        if (!range.intersectsNode(text)) continue;
        const line = document.createRange();
        line.selectNodeContents(text);
        if (text === a.node) line.setStart(text, a.offset);
        if (text === b.node) line.setEnd(text, b.offset);
        if (!line.collapsed) rects.push(...Array.from(line.getClientRects()));
      }
      for (const media of view.dom.querySelectorAll("img, video, audio, iframe, hr")) {
        if (range.intersectsNode(media)) rects.push(media.getBoundingClientRect());
      }
      if (from === to) {
        const caret = view.coordsAtPos(from);
        rects.push(new DOMRect(caret.left, caret.top, 2, caret.bottom - caret.top));
      }
      for (const rect of rects) {
        const left = Math.max(bounds.left, rect.left);
        const top = Math.max(bounds.top, rect.top);
        const width = Math.min(bounds.right, rect.right) - left;
        const height = Math.min(bounds.bottom, rect.bottom) - top;
        if (width <= 0 || height <= 0) continue;
        const piece = document.createElement("span");
        piece.className = "goose-page-write-mask";
        Object.assign(piece.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
        const bar = document.createElement("span");
        bar.className = "goose-skeleton";
        piece.append(bar);
        pieces.push(piece);
      }
    }
    overlay.replaceChildren(...pieces);
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    overlay.remove();
    if (oldBusy === null) view.dom.removeAttribute("aria-busy");
    else view.dom.setAttribute("aria-busy", oldBusy);
    for (const event of ["beforeinput", "paste", "cut", "drop", "keydown"]) view.dom.removeEventListener(event, preventEdit, true);
    window.removeEventListener("scroll", draw, true);
    window.removeEventListener("resize", draw);
    observer.disconnect();
    signal.removeEventListener("abort", cleanup);
  };
  const observer = new ResizeObserver(() => {
    try { draw(); } catch { cleanup(); }
  });
  observer.observe(host);
  window.addEventListener("scroll", draw, true);
  window.addEventListener("resize", draw);
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    if (signal.aborted) cleanup();
    else draw();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return cleanup;
  } catch {
    cleanup();
    return () => {};
  }
}
