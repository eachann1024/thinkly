export interface DetectedCommand {
  query: string;
  range: Range;
}

export function parseSlashCommandBeforeCaret(beforeCaret: string): {
  query: string;
  slashIndex: number;
} | null {
  const slashIndex = beforeCaret.lastIndexOf("/");
  if (slashIndex === -1) return null;
  if (slashIndex > 0) {
    const prevChar = beforeCaret[slashIndex - 1];
    if (!/[\s\n\u200B\uFEFF]/.test(prevChar)) {
      const textBefore = beforeCaret.slice(0, slashIndex);
      if (textBefore.replace(/[\u200B\uFEFF]/g, "").length > 0) {
        return null;
      }
    }
  }
  const rawQuery = beforeCaret.slice(slashIndex + 1);
  if (/[\s\n]/.test(rawQuery)) return null;
  const query = rawQuery.replace(/[\u200B\uFEFF]/g, "");
  return { query, slashIndex };
}

export function getComposerCaretTextContext(container: HTMLElement): {
  textNode: Text;
  beforeCaret: string;
} | null {
  const selection = window.getSelection();
  if (!selection?.isCollapsed) return null;
  const anchor = selection.anchorNode;
  if (!anchor || !container.contains(anchor)) return null;

  if (anchor.nodeType === Node.TEXT_NODE) {
    const textNode = anchor as Text;
    return {
      textNode,
      beforeCaret: (textNode.textContent ?? "").slice(
        0,
        selection.anchorOffset,
      ),
    };
  }

  if (anchor.nodeType !== Node.ELEMENT_NODE) return null;
  const offset = selection.anchorOffset;
  const prev = anchor.childNodes[offset - 1];
  if (prev?.nodeType === Node.TEXT_NODE) {
    const textNode = prev as Text;
    return { textNode, beforeCaret: textNode.textContent ?? "" };
  }
  const next = anchor.childNodes[offset];
  if (next?.nodeType === Node.TEXT_NODE) {
    return { textNode: next as Text, beforeCaret: "" };
  }
  const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode();
  if (first && container.contains(first)) {
    const textNode = first as Text;
    return { textNode, beforeCaret: textNode.textContent ?? "" };
  }
  return null;
}

export function detectCommandAtCaret(
  container: HTMLElement,
): DetectedCommand | null {
  const caret = getComposerCaretTextContext(container);
  if (!caret) return null;
  const parsed = parseSlashCommandBeforeCaret(caret.beforeCaret);
  if (!parsed) return null;
  const range = document.createRange();
  range.setStart(caret.textNode, parsed.slashIndex);
  range.setEnd(caret.textNode, caret.beforeCaret.length);
  return { query: parsed.query, range };
}
