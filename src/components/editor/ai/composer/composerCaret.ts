export const COMPOSER_CARET_ZWSP = "\u200B";

export function isComposerZwspOnlyText(text: string): boolean {
  return text.length > 0 && !/[^\u200B]/.test(text);
}

export function stripComposerCaretZwsp(text: string): string {
  return text.replace(/\u200B/g, "");
}

function placeCaretInTextNode(textNode: Text, offset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const safe = Math.max(0, Math.min(offset, textNode.data.length));
  range.setStart(textNode, safe);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function ensureSingleZwspText(text: Text): Text {
  text.data = COMPOSER_CARET_ZWSP;
  return text;
}

export function placeCaretAfterNode(node: Node) {
  const parent = node.parentNode;
  if (!parent) return;
  const next = node.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    const text = next as Text;
    if (text.data.length > 0 && !isComposerZwspOnlyText(text.data)) {
      placeCaretInTextNode(text, 0);
      return;
    }
    ensureSingleZwspText(text);
    placeCaretInTextNode(text, 0);
    return;
  }
  const anchor = document.createTextNode(COMPOSER_CARET_ZWSP);
  parent.insertBefore(anchor, next);
  placeCaretInTextNode(anchor, 0);
}

export function placeCaretBeforeNode(node: Node) {
  const parent = node.parentNode;
  if (!parent) return;
  const prev = node.previousSibling;
  if (prev && prev.nodeType === Node.TEXT_NODE) {
    const text = prev as Text;
    if (text.data.length > 0 && !isComposerZwspOnlyText(text.data)) {
      placeCaretInTextNode(text, text.data.length);
      return;
    }
    ensureSingleZwspText(text);
    placeCaretInTextNode(text, 0);
    return;
  }
  const anchor = document.createTextNode(COMPOSER_CARET_ZWSP);
  parent.insertBefore(anchor, node);
  placeCaretInTextNode(anchor, 0);
}

const CHIP_SELECTOR =
  "[data-ai-mention-attrs], [data-ai-image-attrs], [data-ai-skill-attrs], [data-ai-selection-quote-attrs]";

function isChipElement(node: Node | null): node is HTMLElement {
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).matches?.(CHIP_SELECTOR) === true
  );
}

export function collapseComposerZwspNodes(editor: HTMLElement) {
  let node: ChildNode | null = editor.firstChild;
  while (node) {
    const next = node.nextSibling;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      const raw = text.data;
      const onlyZwspOrEmpty = raw.length === 0 || isComposerZwspOnlyText(raw);
      if (onlyZwspOrEmpty && next && next.nodeType === Node.TEXT_NODE) {
        const nextText = next as Text;
        const nextOnly =
          nextText.data.length === 0 || isComposerZwspOnlyText(nextText.data);
        if (nextOnly) {
          ensureSingleZwspText(text);
          nextText.remove();
          continue;
        }
      }
      if (raw.length === 0) {
        if (isChipElement(node.previousSibling) || isChipElement(next)) {
          ensureSingleZwspText(text);
        } else {
          text.remove();
          node = next;
          continue;
        }
      } else if (isComposerZwspOnlyText(raw) && raw !== COMPOSER_CARET_ZWSP) {
        ensureSingleZwspText(text);
      }
    }
    node = node.nextSibling;
  }
}

export function ensureComposerCaretAnchors(editor: HTMLElement) {
  const chips = Array.from(editor.querySelectorAll<HTMLElement>(CHIP_SELECTOR));
  for (const chip of chips) {
    const prev = chip.previousSibling;
    if (!prev) {
      editor.insertBefore(document.createTextNode(COMPOSER_CARET_ZWSP), chip);
    } else if (prev.nodeType === Node.TEXT_NODE) {
      const t = prev as Text;
      if (t.data.length === 0 || isComposerZwspOnlyText(t.data)) {
        ensureSingleZwspText(t);
      }
    } else if (isChipElement(prev)) {
      editor.insertBefore(document.createTextNode(COMPOSER_CARET_ZWSP), chip);
    }

    const next = chip.nextSibling;
    if (!next) {
      editor.appendChild(document.createTextNode(COMPOSER_CARET_ZWSP));
    } else if (next.nodeType === Node.TEXT_NODE) {
      const t = next as Text;
      if (t.data.length === 0 || isComposerZwspOnlyText(t.data)) {
        ensureSingleZwspText(t);
      }
    } else if (isChipElement(next)) {
      editor.insertBefore(document.createTextNode(COMPOSER_CARET_ZWSP), next);
    }
  }
  collapseComposerZwspNodes(editor);
}

export function navigateComposerChipArrow(
  editor: HTMLElement,
  direction: "left" | "right",
  getChipBefore: (editor: HTMLElement) => HTMLElement | null,
  getChipAfter: (editor: HTMLElement) => HTMLElement | null,
): boolean {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (
    range.startContainer !== editor &&
    !editor.contains(range.startContainer)
  ) {
    return false;
  }

  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const text = range.startContainer.textContent ?? "";
    if (!isComposerZwspOnlyText(text)) {
      if (direction === "left" && range.startOffset > 0) return false;
      if (direction === "right" && range.startOffset < text.length) {
        return false;
      }
    }
  }

  if (direction === "left") {
    const chip = getChipBefore(editor);
    if (!chip) return false;
    placeCaretBeforeNode(chip);
    return true;
  }

  const chip = getChipAfter(editor);
  if (!chip) return false;
  placeCaretAfterNode(chip);
  return true;
}

export function pruneEmptyComposerTextNodes(editor: HTMLElement) {
  const remove: ChildNode[] = [];
  editor.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "") === "") {
      remove.push(node);
    }
  });
  remove.forEach((node) => node.parentNode?.removeChild(node));
}
