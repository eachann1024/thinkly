import { createExtension } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";

const LIST_ITEM_TYPES = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
]);

export const gooseEmptyNestedListEnterExtension = createExtension({
  key: "goose-empty-nested-list-enter",
  runsBefore: [
    "bullet-list-item-shortcuts",
    "numbered-list-item-shortcuts",
    "check-list-item-shortcuts",
  ],
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const state = editor.prosemirrorState;
      if (!editor.isEditable || editor.prosemirrorView.composing ||
        !(state.selection instanceof TextSelection) || !state.selection.empty) return false;

      const { block } = editor.getTextCursorPosition();
      if (!LIST_ITEM_TYPES.has(block.type)) return false;
      if (!Array.isArray(block.content) || block.content.length > 0) return false;
      if (block.children.length) return false;
      const parent = editor.getParentBlock(block);
      if (!parent) return false;
      if (!editor.canUnnestBlock()) return false;

      const type = LIST_ITEM_TYPES.has(parent.type) ? parent.type : "paragraph";
      const props = type === "checkListItem" ? { checked: false }
        : type === "numberedListItem" ? { start: undefined } : {};
      editor.transact(() => {
        editor.unnestBlock();
        editor.updateBlock(block, { type, props });
        editor.setTextCursorPosition(block, "start");
      });
      return true;
    },
  },
});
