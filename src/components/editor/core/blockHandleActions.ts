import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { NodeSelection } from "prosemirror-state";
import { documentEdgeBlockIds } from "./documentEdgeBlockIds";
import { blockHandleCapabilities, isEmptyHandleParagraph } from "./blockHandleModel";
import { BLOCK_CONVERSIONS } from "./blocknoteCommandSlashItems";
import { sparseBlockHandleTargets } from "../extensions/sparseBlockHandleDecorations";
import { withoutBlockHandleScroll } from "../extensions/blockHandleUiExtension";
import { setBlockColor } from "../toolbars/formatting/blockColorActions";
import { getHandleConversionBlockIds } from "./blockConversionSelection";

type Editor = BlockNoteEditor<any, any, any>;

export function selectHandleBlock(editor: Editor, blockId: string): boolean {
  if (getHandleConversionBlockIds(editor, blockId).length > 1) return true;
  const state = editor.prosemirrorState;
  const target = sparseBlockHandleTargets(state.doc, [blockId])[0];
  if (!target) return false;
  const selection = NodeSelection.create(state.doc, target.pos);
  if (!state.selection.eq(selection)) {
    editor.prosemirrorView.dispatch(state.tr.setSelection(selection).setMeta("addToHistory", false));
  }
  return true;
}

export function openEmptyHandleMenu(editor: Editor, blockId: string): boolean {
  const block = editor.getBlock(blockId);
  const menu = editor.getExtension(SuggestionMenu);
  if (!editor.isEditable || !isEmptyHandleParagraph(block) || !menu || menu.shown()) return false;
  withoutBlockHandleScroll(editor, () => {
    editor.setTextCursorPosition(block!, "start");
    editor.focus();
    menu.openSuggestionMenu("/");
  });
  return true;
}

export function insertFromHandle(editor: Editor, blockId: string, placement: "before" | "after"): string | undefined {
  const block = editor.getBlock(blockId);
  if (!block) return undefined;
  const caps = blockHandleCapabilities(editor, block);
  if (!(placement === "before" ? caps.insertBefore : caps.insertAfter)) return undefined;
  const [created] = editor.insertBlocks([{ type: "paragraph" }], blockId, placement);
  if (created) {
    editor.setTextCursorPosition(created, "start");
    editor.focus();
    editor.getExtension(SuggestionMenu)?.openSuggestionMenu("/");
  }
  return created?.id;
}

export function convertHandleBlock(editor: Editor, blockId: string, target: typeof BLOCK_CONVERSIONS[number], defaultCodeBlockWrap: boolean, selectedIds = getHandleConversionBlockIds(editor, blockId)): boolean {
  const blocks = selectedIds.map((id) => editor.getBlock(id))
    .filter((block) => block && blockHandleCapabilities(editor, block).convert);
  if (!blocks.length) return false;
  editor.transact(() => {
    for (const block of blocks) {
      editor.updateBlock(block!, {
        type: target.type,
        props: { ...("props" in target ? target.props : {}), ...(target.type === "codeBlock" ? { wrap: defaultCodeBlockWrap } : {}) },
      });
    }
  });
  if (blocks.length === 1) editor.setTextCursorPosition(blocks[0]!.id, "end");
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
  if (prop === "textAlignment") editor.updateBlock(block, { props: { [prop]: value } });
  else setBlockColor(editor, blockId, prop, value);
  if (focusEditor) editor.focus();
  return true;
}
