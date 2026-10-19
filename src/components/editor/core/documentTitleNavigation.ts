import type { BlockNoteEditor } from "@blocknote/core";
import { TextSelection, type Selection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { DocumentTitleStep } from "./documentTitleHistory";
import type { DocumentTitleSplit } from "@/lib/document-title-keyboard";

type Editor = BlockNoteEditor<any, any, any>;

function bodyStart(editor: Editor) {
  const blocks = editor.document;
  const first = blocks[0];
  // YAML 属性必须留在文件头，否则下一次保存会变成正文或重复生成 frontmatter。
  const header = first?.type === "codeBlock" && first.props.language === "yaml-frontmatter" ? first : undefined;
  return { header, first: blocks[header ? 1 : 0] };
}

/** 只接受首个顶层块本身的文字起点，不穿过表格、子块或块选区。 */
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

/** 标题按光标拆分；原正文与属性头保留，拆分和标题变化共用一次撤销。 */
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
  // 随后输入正文另起一次历史记录，避免撤销打字时连同拆分一起撤销。
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

/**
 * 正文退格回到标题末尾：正文为空，或光标已在首段文字起点。
 * 起点前面没有字符，退格不会改掉已有文字。
 * 带子块的空段，以及列表／标题，仍走原来的退格。
 */
export function shouldBackspaceToDocumentTitle(editor: Editor): boolean {
  if (!canReturnToDocumentTitle(editor)) return false;
  const { first } = bodyStart(editor);
  if (!first || first.type !== "paragraph") return false;
  if (paragraphHasInlineContent(first)) return true;
  return !first.children?.length;
}

/**
 * 首段是空段落且正文还有别的块时，退格把这行空段直接删掉，
 * 光标交给标题末尾；正文只剩这一个空段时保留它，标题回车还能继续用。
 */
export function removeEmptyFirstBodyParagraph(editor: Editor): boolean {
  const { first, header } = bodyStart(editor);
  if (!first || first.type !== "paragraph") return false;
  if (paragraphHasInlineContent(first) || first.children?.length) return false;
  if (editor.document.length - (header ? 1 : 0) <= 1) return false;
  editor.removeBlocks([first]);
  return true;
}
