import { createExtension } from "@blocknote/core";

const LIST_ITEM_TYPES = new Set([
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
]);

export const gooseEmptyNestedListEnterExtension = createExtension({
  key: "goose-empty-nested-list-enter",
  runsBefore: [
    "bullet-list-item-shortcuts",
    "numbered-list-item-shortcuts",
    "check-list-item-shortcuts",
    "toggle-list-item-shortcuts",
  ],
  keyboardShortcuts: {
    Enter: ({ editor }) => {
      const state = editor.prosemirrorState;
      if (!state.selection.empty) return false;

      const { block } = editor.getTextCursorPosition();
      if (!LIST_ITEM_TYPES.has(block.type)) return false;
      if (!Array.isArray(block.content) || block.content.length > 0) return false;
      if (!editor.getParentBlock(block)) return false;
      if (!editor.canUnnestBlock()) return false;

      editor.unnestBlock();
      return true;
    },
  },
});
