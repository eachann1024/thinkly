import { createExtension } from "@blocknote/core";
import { deleteSelectedBlocks } from "./crossBlockDeleteActions";
import { selectAdjacentMediaForDeletion } from "./mediaBlockDelete";
import {
  deleteEmptyInlineLineBackward,
  deleteEmptyLineBackward,
  preventForwardDeleteIntoStructureBlock,
} from "./emptyLineDelete";
export * from "./crossBlockSelection";
export * from "./crossBlockDeleteActions";
export * from "./emptyLineDelete";

export const gooseCrossBlockDeleteExtension = createExtension({
  key: "goose-cross-block-delete",
  runsBefore: ["goose-empty-block-backspace", "default"],
  keyboardShortcuts: {
    Backspace: ({ editor }) => {
      if (!editor.isEditable || editor.prosemirrorView.composing) return false;
      return (
        deleteSelectedBlocks(editor) ||
        selectAdjacentMediaForDeletion(editor, -1) ||
        deleteEmptyInlineLineBackward(editor) ||
        (["paragraph", "codeBlock"].includes(
          editor.prosemirrorState.selection.$from.parent.type.name,
        ) &&
          deleteEmptyLineBackward(editor))
      );
    },
    Delete: ({ editor }) => {
      if (!editor.isEditable || editor.prosemirrorView.composing) return false;
      return (
        deleteSelectedBlocks(editor) ||
        selectAdjacentMediaForDeletion(editor, 1) ||
        deleteEmptyInlineLineBackward(editor) ||
        deleteEmptyLineBackward(editor) ||
        preventForwardDeleteIntoStructureBlock(editor)
      );
    },
  },
});
