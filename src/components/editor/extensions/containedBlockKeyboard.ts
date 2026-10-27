import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { containedPasteTarget } from "../utils/containedPaste";
import { isContainedBlockContent } from "../utils/containedBlockPolicy";

type Editor = BlockNoteEditor<any, any, any>;

function insertFollowingBlock(editor: Editor, blockId: string, type: string) {
  if (!editor.isEditable || !editor.getBlock(blockId)) return;
  editor.transact(() => {
    const [created] = editor.insertBlocks([{ type }], blockId, "after");
    if (created) editor.setTextCursorPosition(created, "start");
  });
  editor.focus();
}

export function insertParagraphAfterBlock(editor: Editor, blockId: string) {
  insertFollowingBlock(editor, blockId, "paragraph");
}

function enterInContainer(editor: Editor): boolean {
  const state = editor.prosemirrorState;
  if (!editor.isEditable || editor.prosemirrorView.composing || !(state.selection instanceof TextSelection)) return false;
  const { $from, $to } = state.selection;
  if (!$from.sameParent($to)) return false;
  const { block } = editor.getTextCursorPosition();
  if (state.selection.empty && block.type === "paragraph" && !$from.parent.content.size && !block.children.length) {
    const parent = editor.getParentBlock(block);
    const parentContainer = $from.depth >= 5 ? $from.node($from.depth - 3) : null;
    if (parent && parent.children.at(-1)?.id === block.id &&
      parentContainer?.type.name === "blockContainer" &&
      parentContainer.firstChild && isContainedBlockContent(parentContainer.firstChild)) {
      editor.transact(() => {
        editor.removeBlocks([block]);
        insertParagraphAfterBlock(editor, parent.id);
      });
      return true;
    }
  }
  if (!containedPasteTarget(state)) return false;
  const atEnd = state.selection.empty && $from.parentOffset === $from.parent.content.size;
  const last = $from.parent.lastChild;
  if (atEnd && (!last || last.type.name === "hardBreak")) {
    editor.transact((tr) => {
      if (last) tr.delete(state.selection.from - 1, state.selection.from);
      insertParagraphAfterBlock(editor, block.id);
    });
  } else {
    editor.prosemirrorView.dispatch(state.tr.replaceSelectionWith(state.schema.nodes.hardBreak.create()).scrollIntoView());
  }
  return true;
}

export const gooseContainedBlockKeyboard = createExtension({
  key: "goose-contained-block-keyboard",
  runsBefore: ["bullet-list-item-shortcuts", "numbered-list-item-shortcuts", "check-list-item-shortcuts", "goose-empty-nested-list-enter"],
  keyboardShortcuts: { Enter: ({ editor }) => enterInContainer(editor) },
});
