import type { AiFileReferenceAttrs } from "./referenceLookup";
import { getComposerCaretTextContext } from "./composerCommandDetection";
import { createTranslator, i18nYaml } from "@/i18n";

const messages = i18nYaml<"src/components/editor/ai/composer/composerMentionDom.ts#messages:1">`
zh-Hans:
  source: "参考"
  target: "写入位置"
en:
  source: "Reference"
  target: "Write destination"
ja:
  source: "参照"
  target: "書き込み先"
`;
const t = createTranslator(messages);

export interface DetectedMention { query: string; range: Range }

export function detectMentionAtCaret(container: HTMLElement): DetectedMention | null {
  const caret = getComposerCaretTextContext(container);
  if (!caret) return null;

  const atIndex = caret.beforeCaret.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0) {
    const prevChar = caret.beforeCaret[atIndex - 1];
    if (!/[\s\n\u200B\uFEFF]/.test(prevChar)) {
      const textBefore = caret.beforeCaret.slice(0, atIndex);
      if (textBefore.replace(/[\u200B\uFEFF]/g, "").length > 0) {
        return null;
      }
    }
  }

  const rawQuery = caret.beforeCaret.slice(atIndex + 1);
  if (/[\s\n]/.test(rawQuery)) return null;
  const query = rawQuery.replace(/[\u200B\uFEFF]/g, "");

  const range = document.createRange();
  range.setStart(caret.textNode, atIndex);
  range.setEnd(caret.textNode, caret.beforeCaret.length);

  return { query, range };
}

export function resolveMentionAnchorRect(range: Range, editor: HTMLElement): DOMRect {
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  const clientRects = range.getClientRects();
  if (clientRects.length > 0) {
    const first = clientRects[0];
    if (first.width > 0 || first.height > 0) {
      return first;
    }
  }

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const caretRect = selection.getRangeAt(0).getBoundingClientRect();
    if (caretRect.width > 0 || caretRect.height > 0) {
      return caretRect;
    }
  }

  return editor.getBoundingClientRect();
}

export function createChipElement(
  attrs: AiFileReferenceAttrs,
): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.aiMentionId = attrs.pageId;
  span.dataset.aiMentionAttrs = JSON.stringify(attrs);
  span.className =
    "ai-composer-chip inline-flex items-center justify-center rounded text-[11px] font-medium" +
    " bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)] border border-[var(--goose-inline-code-border-hover)]" +
    " cursor-pointer hover:bg-[var(--goose-interactive-hover)] select-none";
  span.textContent = `@${attrs.titleSnapshot}`;
  span.title = [attrs.notebookNameSnapshot, attrs.locationSnapshot, t(attrs.role === "target" ? "target" : "source")].filter(Boolean).join(" / ");
  return span;
}
