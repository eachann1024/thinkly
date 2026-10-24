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
    // The caption remains the handle's anchor even when the code wraps or collapses.
    const caption = content.querySelector<HTMLElement>(".goose-code-toolbar-left");
    if (!caption || caption.closest(".bn-block-content") !== content) return undefined;
    const bounds = caption.getBoundingClientRect();
    return bounds.height > 0 ? bounds.top + bounds.height / 2 : undefined;
  }
  if (["image", "video", "audio", "file", "table", "column", "columnList", "columnSection"].includes(content.dataset.contentType ?? "")) return undefined;
  const inline = content.querySelector<HTMLElement>(".bn-inline-content");
  if (!inline || inline.closest(".bn-block-content") !== content) return undefined;
  const bounds = inline.getBoundingClientRect();
  if (bounds.height <= 0) return undefined;
  const doc = inline.ownerDocument;
  const walker = doc.createTreeWalker(inline, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const isBreak = node instanceof Element && node.tagName === "BR";
    if (isBreak || (node.nodeType === Node.TEXT_NODE && node.textContent?.length)) {
      const range = doc.createRange();
      if (isBreak) range.selectNode(node);
      else {
        range.setStart(node, 0);
        // A full Unicode character also handles a leading surrogate pair.
        range.setEnd(node, (node.textContent?.codePointAt(0) ?? 0) > 0xffff ? 2 : 1);
      }
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
