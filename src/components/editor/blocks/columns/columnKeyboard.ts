import type { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { findColumnsContext } from "./columnActions";
import { COLUMN_LAYOUT, COLUMN_SECTION, firstColumnBlock } from "./columnModel";
import { currentBlockNode, isBlockNodeSelection } from "../../extensions/blockSelectionModel";
import { findCollapsedHeadingsHidingBlock } from "../../core/headingSectionFold";
import { getProtectedTitleBlockId } from "../../utils/documentTitlePolicy";

type Editor = BlockNoteEditor<any, any, any>;

function focusBlock(editor: Editor, block: any, end: boolean) {
  if (!block) return;
  const collapsed = findCollapsedHeadingsHidingBlock(editor.document, block.id, getProtectedTitleBlockId(editor));
  editor.transact(() => {
    collapsed.forEach((id) => editor.updateBlock(id, { props: { collapsed: false } }));
    editor.setTextCursorPosition(block, end ? "end" : "start");
  });
}

function focusNextColumn(editor: Editor, context: ReturnType<typeof findColumnsContext>, direction: -1 | 1, createAfter: boolean) {
  if (!context?.section) return;
  const { layout, section } = context;
  const index = layout.children.findIndex((child: any) => child.id === section.id);
  const adjacent = layout.children[index + direction];
  const outside = adjacent ?? (direction < 0 ? editor.getPrevBlock(layout) : editor.getNextBlock(layout));
  let target = firstColumnBlock(outside, direction < 0);
  if (!target && !outside && direction > 0 && createAfter) {
    [target] = editor.insertBlocks([{ type: "paragraph" }], layout, "after");
  }
  focusBlock(editor, target, direction < 0);
}

export function handleColumnKey(editor: Editor, event: KeyboardEvent): boolean {
  if (!editor.isEditable || editor.prosemirrorView.composing || event.isComposing || event.keyCode === 229) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const state = editor.prosemirrorState;
  const current = currentBlockNode(state);
  const block = current ? editor.getBlock(String(current.node.attrs.id)) : undefined;
  if (!block) return false;
  const context = findColumnsContext(editor, block.id);
  const structural = block.type === COLUMN_LAYOUT || block.type === COLUMN_SECTION;
  if (isBlockNodeSelection(state)) {
    if (structural && event.key === "Tab") return true;
    if (structural && event.key === "Enter") {
      focusBlock(editor, firstColumnBlock(block), false);
      return true;
    }
    if (context?.section && !event.shiftKey) {
      const backwards = event.key === "ArrowLeft" || event.key === "ArrowUp";
      const forwards = event.key === "ArrowRight" || event.key === "ArrowDown";
      if ((backwards || forwards) && firstColumnBlock(context.section, forwards)?.id === block.id) {
        focusNextColumn(editor, context, backwards ? -1 : 1, forwards);
        return true;
      }
    }
    return false;
  }
  if (!context?.section || !(state.selection instanceof TextSelection)) return false;
  if (event.key === "Tab") {
    if (block.type === "codeBlock") return false;
    const parent = editor.getParentBlock(block);
    const selected = editor.getSelection()?.blocks ?? [block];
    if (selected.some((item: any) => [COLUMN_LAYOUT, COLUMN_SECTION].includes(item.type))) return true;
    if (event.shiftKey && parent?.type === COLUMN_SECTION) return true;
    const previous = editor.getPrevBlock(block);
    return !event.shiftKey && (!previous || previous.type === COLUMN_LAYOUT || previous.type === COLUMN_SECTION);
  }
  if (!state.selection.empty || event.shiftKey) return false;
  const parent = editor.getParentBlock(block);
  if (event.key === "Enter" && parent?.type === COLUMN_SECTION && block.type === "paragraph" && !state.selection.$from.parent.content.size) {
    const [inserted] = editor.insertBlocks([{ type: "paragraph" }], block, "after");
    editor.setTextCursorPosition(inserted, "start");
    return true;
  }
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  const backwards = ["Backspace", "ArrowLeft", "ArrowUp"].includes(event.key);
  const forwards = ["Delete", "ArrowRight", "ArrowDown"].includes(event.key);
  if (!backwards && !forwards) return false;
  const endpoint = firstColumnBlock(context.section, forwards);
  if (endpoint?.id !== block.id) return false;
  const boundary = event.key === "ArrowUp" || event.key === "ArrowDown"
    ? editor.prosemirrorView.endOfTextblock(backwards ? "up" : "down")
    : $from.parentOffset === (backwards ? 0 : $from.parent.content.size);
  if (!boundary) return false;
  if (event.key === "Backspace" || event.key === "Delete") return true;
  focusNextColumn(editor, context, backwards ? -1 : 1, event.key === "ArrowDown" || event.key === "ArrowRight");
  return true;
}
