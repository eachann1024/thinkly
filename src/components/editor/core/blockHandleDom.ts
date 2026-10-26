export function ownBlockHandleContent(container: Element | null): HTMLElement | null {
  if (!container) return null;
  return Array.from(container.querySelectorAll<HTMLElement>(".bn-block-content"))
    .find((content) => content.closest('[data-node-type="blockContainer"]') === container) ?? null;
}

export function findBlockHandleContent(root: HTMLElement, blockId: string): HTMLElement | null {
  const container = root.querySelector(`[data-node-type="blockContainer"][data-id="${CSS.escape(blockId)}"]`);
  return ownBlockHandleContent(container);
}

/** Measure one text fragment, never every wrapped line of a potentially large block. */
export function blockHandleFirstLineCenter(content: HTMLElement): number | undefined {
  if (content.dataset.contentType === "codeBlock") {
    // The handle follows the first code line (the legend chip now straddles the top border).
    const node = content.querySelector<HTMLElement>(".goose-code-block-node");
    if (!node || node.closest(".bn-block-content") !== content) return undefined;
    const nodeBounds = node.getBoundingClientRect();
    if (nodeBounds.height <= 0) return undefined;
    if (node.dataset.collapsed === "true") {
      const legends = node.querySelector<HTMLElement>(".goose-code-toolbar-left")?.getBoundingClientRect();
      return legends && legends.height > 0 ? legends.top + legends.height / 2 : nodeBounds.top + nodeBounds.height / 2;
    }
    const pre = node.querySelector<HTMLElement>(".goose-code-pre:not(.goose-code-pre-hidden)");
    if (pre) {
      const style = getComputedStyle(pre);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.7;
      return pre.getBoundingClientRect().top + (parseFloat(style.paddingTop) || 0) + lineHeight / 2;
    }
    return nodeBounds.top + 24;
  }
  if (["image", "video", "audio", "file", "table"].includes(content.dataset.contentType ?? "")) return undefined;
  const inline = content.querySelector<HTMLElement>(".bn-inline-content");
  if (!inline || inline.closest(".bn-block-content") !== content) return undefined;
  const bounds = inline.getBoundingClientRect();
  if (bounds.height <= 0) return undefined;
  const doc = inline.ownerDocument;
  const walker = doc.createTreeWalker(inline, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const isBreak = node instanceof Element && node.tagName === "BR";
    if (isBreak) break;
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.length) {
      const range = doc.createRange();
      range.setStart(node, 0);
      // A full Unicode character also handles a leading surrogate pair.
      range.setEnd(node, (node.textContent?.codePointAt(0) ?? 0) > 0xffff ? 2 : 1);
      const first = range.getClientRects()[0];
      if (first?.height > 0) return first.top + first.height / 2;
      break;
    }
    node = walker.nextNode();
  }
  // Empty paragraphs have no text Range; use their first CSS line box instead.
  const style = getComputedStyle(inline);
  const scale = inline.offsetHeight > 0 ? bounds.height / inline.offsetHeight : 1;
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
  const paddingTop = (Number.parseFloat(style.paddingTop) || 0) * scale;
  const borderTop = (Number.parseFloat(style.borderTopWidth) || 0) * scale;
  return bounds.top + paddingTop + borderTop + Math.min(bounds.height, lineHeight * scale) / 2;
}
