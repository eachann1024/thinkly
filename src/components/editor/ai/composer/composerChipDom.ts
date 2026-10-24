import {
  isComposerZwspOnlyText,
  stripComposerCaretZwsp,
} from "./useSkillCommands";
export {
  resolveComposerBeforeInputDelete,
  type ComposerBeforeInputDeleteAction,
} from "./composerDeleteDecision";

export const COMPOSER_CHIP_SELECTOR =
  "[data-ai-mention-attrs], [data-ai-image-attrs], [data-ai-skill-attrs], [data-ai-selection-quote-attrs]";

export function isComposerChipElement(node: Node | null): node is HTMLElement {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  return (
    el.dataset.aiMentionAttrs != null ||
    el.dataset.aiImageAttrs != null ||
    el.dataset.aiSkillAttrs != null ||
    el.dataset.aiSelectionQuoteAttrs != null
  );
}

export function editorHasComposerChips(editor: HTMLElement): boolean {
  return Boolean(editor.querySelector(COMPOSER_CHIP_SELECTOR));
}

export function selectionCoversEntireEditor(
  editor: HTMLElement,
  range: Range,
): boolean {
  try {
    const full = document.createRange();
    full.selectNodeContents(editor);
    return (
      range.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    );
  } catch {
    return false;
  }
}

export function rangeContainsComposerChip(
  range: Range,
  editor?: HTMLElement | null,
): boolean {
  const root =
    editor ??
    (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range.commonAncestorContainer.parentElement);
  if (!root) return false;
  const scope =
    (root.closest?.("[data-ai-composer-editor]") as HTMLElement | null) ?? root;
  const chips = scope.querySelectorAll?.(COMPOSER_CHIP_SELECTOR);
  if (!chips) return false;
  for (const chip of chips) {
    try {
      if (range.intersectsNode(chip)) return true;
    } catch {
    }
  }
  return false;
}

function skipEmptyTextSiblings(
  node: Node | null,
  direction: "previous" | "next",
): Node | null {
  let current = node;
  while (current && current.nodeType === Node.TEXT_NODE) {
    const text = current.textContent ?? "";
    if (text.length > 0 && !isComposerZwspOnlyText(text)) break;
    current =
      direction === "previous" ? current.previousSibling : current.nextSibling;
  }
  return current;
}

export function getComposerChipBeforeCaret(
  editor: HTMLElement,
  range?: Range | null,
): HTMLElement | null {
  const live =
    range ??
    (window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0)
      : null);
  if (!live || !live.collapsed || !editor.contains(live.startContainer)) {
    return null;
  }
  const { startContainer, startOffset } = live;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent ?? "";
    const onlyZwsp = isComposerZwspOnlyText(text);
    if (startOffset > 0 && !onlyZwsp) return null;
    let node: Node | null = startContainer;
    while (node && node !== editor) {
      const prev = skipEmptyTextSiblings(node.previousSibling, "previous");
      if (isComposerChipElement(prev)) return prev;
      if (prev) return null;
      node = node.parentNode;
    }
    return null;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = startContainer as HTMLElement;
    let i = startOffset - 1;
    while (i >= 0) {
      const child = el.childNodes[i];
      if (isComposerChipElement(child)) return child;
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent ?? "";
        if (!t.length || isComposerZwspOnlyText(t)) {
          i -= 1;
          continue;
        }
      }
      return null;
    }
  }
  return null;
}

export function getComposerChipAfterCaret(
  editor: HTMLElement,
  range?: Range | null,
): HTMLElement | null {
  const live =
    range ??
    (window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0)
      : null);
  if (!live || !live.collapsed || !editor.contains(live.startContainer)) {
    return null;
  }
  const { startContainer, startOffset } = live;

  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent ?? "";
    const len = text.length;
    const onlyZwsp = isComposerZwspOnlyText(text);
    if (startOffset < len && !onlyZwsp) return null;
    let node: Node | null = startContainer;
    while (node && node !== editor) {
      const next = skipEmptyTextSiblings(node.nextSibling, "next");
      if (isComposerChipElement(next)) return next;
      if (next) return null;
      node = node.parentNode;
    }
    return null;
  }

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    const el = startContainer as HTMLElement;
    let i = startOffset;
    while (i < el.childNodes.length) {
      const child = el.childNodes[i];
      if (isComposerChipElement(child)) return child;
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent ?? "";
        if (!t.length || isComposerZwspOnlyText(t)) {
          i += 1;
          continue;
        }
      }
      return null;
    }
  }
  return null;
}

export function removeComposerChipsIntersectingRange(
  editor: HTMLElement,
  range: Range,
) {
  const chips = Array.from(
    editor.querySelectorAll<HTMLElement>(COMPOSER_CHIP_SELECTOR),
  );
  for (const chip of chips) {
    try {
      if (range.intersectsNode(chip)) {
        chip.remove();
      }
    } catch {
    }
  }
}

export function cleanupOrphanComposerZwspNodes(editor: HTMLElement) {
  const hasChips = editorHasComposerChips(editor);
  const rawText = editor.textContent ?? "";
  const visible = stripComposerCaretZwsp(rawText).trim();

  if (!hasChips && visible.length === 0) {
    editor.innerHTML = "";
    return;
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const toRemove: Text[] = [];
  let node = walker.nextNode() as Text | null;
  while (node) {
    const val = node.data;
    if (isComposerZwspOnlyText(val)) {
      const prev = node.previousSibling;
      const next = node.nextSibling;
      const isAdjacentToChip =
        isComposerChipElement(prev) || isComposerChipElement(next);
      if (!isAdjacentToChip) {
        toRemove.push(node);
      }
    }
    node = walker.nextNode() as Text | null;
  }
  for (const n of toRemove) {
    n.remove();
  }
}

export function placeCaretInEditor(editor: HTMLElement, atStart: boolean) {
  const selection = window.getSelection();
  if (!selection) return;
  const caret = document.createRange();
  caret.selectNodeContents(editor);
  caret.collapse(atStart);
  selection.removeAllRanges();
  selection.addRange(caret);
}

export function isEditorDomEmpty(el: HTMLElement) {
  if (el.querySelector(COMPOSER_CHIP_SELECTOR)) {
    return false;
  }
  return !stripComposerCaretZwsp(el.textContent ?? "").trim();
}
