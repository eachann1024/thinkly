import type { BlockNoteEditor } from "@blocknote/core";
import { TextSelection, type Selection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { DocumentTitleStep } from "./documentTitleHistory";
import { normalizeNewFileName } from "@/lib/new-page-name";
import { sanitizeFilenameSegment } from "@/lib/local-title-binding";
import type { DocumentTitleSplit } from "@/lib/document-title-keyboard";

type Editor = BlockNoteEditor<any, any, any>;

function bodyStart(editor: Editor) {
  const blocks = editor.document;
  const first = blocks[0];
  const header = first?.type === "codeBlock" && first.props.language === "yaml-frontmatter" ? first : undefined;
  return { header, first: blocks[header ? 1 : 0] };
}

export function isFirstBodyTextStart(selection: Selection, firstBlockId: string): boolean {
  if (!(selection instanceof TextSelection) || !selection.empty) return false;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parentOffset !== 0) return false;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "blockContainer") return node.attrs.id === firstBlockId;
  }
  return false;
}

export function enterFirstBodyParagraph(editor: Editor, split?: DocumentTitleSplit): boolean {
  const { first, header } = bodyStart(editor);
  if (!first && !header) return false;
  const reusable = first?.type === "paragraph" && Array.isArray(first.content) &&
    first.content.length === 0 && !first.children?.length;
  editor.transact((tr) => {
    closeHistory(tr);
    let target = first;
    const content = split?.body ?? "";
    if (!reusable) {
      [target] = editor.insertBlocks([{ type: "paragraph", content }], first ?? header!, first ? "before" : "after");
    } else if (content) {
      editor.updateBlock(first, { content });
    }
    if (split && split.before !== split.title) tr.step(new DocumentTitleStep(split.pageId, split.before, split.title));
    editor.setTextCursorPosition(target, "start");
  });
  editor.transact((tr) => { closeHistory(tr); });
  return true;
}

export function canReturnToDocumentTitle(editor: Editor): boolean {
  const { first } = bodyStart(editor);
  return Boolean(first && first.type !== "codeBlock" &&
    editor.schema.blockSpecs[first.type]?.config.content === "inline" &&
    isFirstBodyTextStart(editor.prosemirrorState.selection, first.id));
}

function paragraphHasInlineContent(block: { content?: unknown }): boolean {
  return Array.isArray(block.content) && block.content.length > 0;
}

export function shouldBackspaceToDocumentTitle(editor: Editor): boolean {
  if (!canReturnToDocumentTitle(editor)) return false;
  const { first } = bodyStart(editor);
  if (!first || first.type !== "paragraph") return false;
  if (paragraphHasInlineContent(first)) return true;
  return !first.children?.length;
}

export function removeEmptyFirstBodyParagraph(editor: Editor): boolean {
  const { first, header } = bodyStart(editor);
  if (!first || first.type !== "paragraph") return false;
  if (paragraphHasInlineContent(first) || first.children?.length) return false;
  if (editor.document.length - (header ? 1 : 0) <= 1) return false;
  editor.removeBlocks([first]);
  return true;
}

export function focusFirstBodyBlock(editor: Editor): boolean {
  const { first } = bodyStart(editor);
  if (!first) return false;
  editor.setTextCursorPosition(first, "start");
  editor.focus();
  return true;
}

export function mergedFirstBodyTitle(editor: Editor, title: string): string | null {
  const { first } = bodyStart(editor);
  if (!first || first.type !== "paragraph") return null;
  const inlineText = (content: any[]): string | null => {
    let text = "";
    for (const item of content) {
      if (item.type === "text") text += item.text;
      else if (item.type === "link") {
        const nested = inlineText(item.content);
        if (nested === null) return null;
        text += nested;
      } else return null;
    }
    return text;
  };
  const text = inlineText(first.content as any[]);
  if (text === null) return null;
  const after = title + text;
  if (text) {
    try {
      if (normalizeNewFileName(after) !== after || sanitizeFilenameSegment(after, " (99).markdown") !== after) return null;
    } catch { return null; }
  }
  return after;
}

export function mergeFirstBodyParagraph(editor: Editor, pageId: string, title: string): boolean {
  const { first, header } = bodyStart(editor);
  const after = mergedFirstBodyTitle(editor, title);
  if (!first || after === null) return false;
  editor.transact((tr) => {
    closeHistory(tr);
    if (first.children?.length) editor.replaceBlocks([first], first.children);
    else if (editor.document.length - (header ? 1 : 0) > 1) editor.removeBlocks([first]);
    else editor.updateBlock(first, { content: [] });
    tr.setMeta("document-title-persisted", true);
    if (after !== title) tr.step(new DocumentTitleStep(pageId, title, after));
  });
  editor.transact((tr) => { closeHistory(tr); });
  return true;
}
