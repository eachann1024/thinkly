import { getNodeById, type BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { NodeSelection } from "prosemirror-state";
import { blockHandleCapabilities, isEmptyHandleParagraph } from "./blockHandleModel";
import { getSectionInsertAnchorId, readHeadingCollapsed } from "./headingSectionFold";
import { BLOCK_CONVERSIONS } from "./blocknoteCommandSlashItems";

type Editor = BlockNoteEditor<any, any, any>;

export function selectHandleBlock(editor: Editor, blockId: string): boolean {
  const node = getNodeById(blockId, editor.prosemirrorState.doc);
  if (!node) return false;
  editor.prosemirrorView.dispatch(editor.prosemirrorState.tr.setSelection(
    NodeSelection.create(editor.prosemirrorState.doc, node.posBeforeNode),
  ));
  return true;
}

export function openEmptyHandleMenu(editor: Editor, blockId: string): boolean {
  const block = editor.getBlock(blockId);
  const menu = editor.getExtension(SuggestionMenu);
  if (!editor.isEditable || !isEmptyHandleParagraph(block) || !menu || menu.shown()) return false;
  editor.setTextCursorPosition(block!, "start");
  editor.focus();
  menu.openSuggestionMenu("/");
  return true;
}

export function insertFromHandle(editor: Editor, blockId: string, placement: "before" | "after"): string | undefined {
  const block = editor.getBlock(blockId);
  if (!block) return undefined;
  const caps = blockHandleCapabilities(editor, block);
  if (!(placement === "before" ? caps.insertBefore : caps.insertAfter)) return undefined;
  const anchorId = placement === "after" && block.type === "heading" &&
    !block.props.isToggleable && readHeadingCollapsed(block)
    ? getSectionInsertAnchorId(editor.document as any, blockId) : blockId;
  const [created] = editor.insertBlocks([{ type: "paragraph" }], anchorId, placement);
  if (created) {
    editor.setTextCursorPosition(created, "start");
    editor.focus();
    editor.getExtension(SuggestionMenu)?.openSuggestionMenu("/");
  }
  return created?.id;
}

export function convertHandleBlock(editor: Editor, blockId: string, target: typeof BLOCK_CONVERSIONS[number], defaultCodeBlockWrap: boolean): boolean {
  const block = editor.getBlock(blockId);
  if (!block || !blockHandleCapabilities(editor, block).convert) return false;
  editor.updateBlock(block, {
    type: target.type,
    props: { ...("props" in target ? target.props : {}), ...(target.type === "codeBlock" ? { wrap: defaultCodeBlockWrap } : {}) },
  });
  editor.setTextCursorPosition(blockId, "end");
  editor.focus();
  return true;
}

export function deleteHandleBlock(editor: Editor, blockId: string): boolean {
  const block = editor.getBlock(blockId);
  if (!block || !blockHandleCapabilities(editor, block).mutate) return false;
  editor.removeBlocks([block]);
  editor.focus();
  return true;
}

export function setHandleBlockProperty(editor: Editor, blockId: string, prop: "textColor" | "backgroundColor" | "textAlignment", value: string, focusEditor = true): boolean {
  const block = editor.getBlock(blockId);
  if (!block) return false;
  const caps = blockHandleCapabilities(editor, block);
  if (prop === "textAlignment" ? !caps.align : !caps.color) return false;
  editor.updateBlock(block, { props: { [prop]: value } });
  if (focusEditor) editor.focus();
  return true;
}
