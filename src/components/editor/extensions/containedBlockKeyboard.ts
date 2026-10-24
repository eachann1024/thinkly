import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { containedPasteTarget } from "../utils/containedPaste";

type Editor = BlockNoteEditor<any, any, any>;

const CONTINUING_LISTS = new Set(["bulletListItem", "numberedListItem", "checkListItem"]);

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

function continueList(editor: Editor, block: { id: string; type: string }): boolean {
  const state = editor.prosemirrorState;
  const { $from } = state.selection;
  const atEnd = state.selection.empty && $from.parentOffset === $from.parent.content.size;
  const last = $from.parent.lastChild;
  if (!(atEnd && last?.type.name === "hardBreak")) return false;
  editor.transact((tr) => {
    tr.delete(state.selection.from - 1, state.selection.from);
    insertFollowingBlock(editor, block.id, block.type);
  });
  return true;
}

function enterInContainer(editor: Editor): boolean {
  const state = editor.prosemirrorState;
  if (!editor.isEditable || editor.prosemirrorView.composing || !(state.selection instanceof TextSelection)) return false;
  const { $from, $to } = state.selection;
  if (!$from.sameParent($to)) return false;
  const { block } = editor.getTextCursorPosition();
  if (state.selection.empty && block.type === "paragraph" && !$from.parent.content.size && !block.children.length) {
    const parent = editor.getParentBlock(block);
    if (parent && parent.children.at(-1)?.id === block.id &&
      !["columnSection", "columnLayout"].includes(parent.type)) {
      editor.transact(() => {
        editor.removeBlocks([block]);
        insertParagraphAfterBlock(editor, parent.id);
      });
      return true;
    }
  }
  if (!containedPasteTarget(state)) return false;
  if (CONTINUING_LISTS.has(block.type)) return continueList(editor, block);
  if (block.type === "toggleListItem") return false;
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
