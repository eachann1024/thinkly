import { createExtension } from "@blocknote/core";
import { findParentBlock, isToggleBlock, type ToggleBlock } from "../core/toggleBlocks";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";

const LIST_ITEM_TYPES = new Set(["bulletListItem", "numberedListItem", "checkListItem"]);
type NestedBlock = { id: string; type: string; content?: unknown; children?: NestedBlock[] };
const isInlineBlockEmpty = (block: { content?: unknown }) =>
  Array.isArray(block.content) && block.content.length === 0;

/** 只移除空叶子项，后续兄弟仍留在原 parent.children。 */
export function deleteEmptyNestedListItem(editor: any, block: NestedBlock): boolean {
  if (!LIST_ITEM_TYPES.has(block.type) || !isInlineBlockEmpty(block) || block.children?.length) return false;
  const parent = findParentBlock(editor.document as ToggleBlock[], block.id) as NestedBlock | null | undefined;
  if (!parent?.children) return false;
  const index = parent.children.findIndex((child) => child.id === block.id);
  if (index < 0) return false;
  editor.transact(() => {
    editor.removeBlocks([block]);
    editor.setTextCursorPosition(index > 0 ? parent.children![index - 1] : parent, "end");
  });
  return true;
}

/** 移除 toggle 外壳时把完整 children 提升为后续兄弟，绝不 removeBlocks 整棵树。 */
function unwrapToggle(editor: any, block: any, keepHeading = false): boolean {
  const children = block.children as any[];
  editor.transact(() => {
    editor.updateBlock(block, {
      type: keepHeading ? "heading" : "paragraph",
      props: keepHeading ? { isToggleable: false, collapsed: false } : {},
      children: [],
    });
    if (children.length) editor.insertBlocks(children, block, "after");
    editor.setTextCursorPosition(block, "start");
  });
  return true;
}

/** 空控件退格原地降级；只有明确选区删除才能删除带内容的子树。 */
export const gooseEmptyBlockBackspaceExtension = createExtension({
  key: "goose-empty-block-backspace",
  keyboardShortcuts: {
    Backspace: ({ editor }) => {
      const state = editor.prosemirrorState;
      if (!state.selection.empty || state.selection.$from.parentOffset !== 0) return false;
      const block = editor.getTextCursorPosition().block;
      if (block.id === getProtectedTitleBlockId(editor)) return false;
      if (deleteEmptyNestedListItem(editor, block)) return true;

      if (block.type === "paragraph" && isInlineBlockEmpty(block) && !block.children.length) {
        const parent = findParentBlock(editor.document as ToggleBlock[], block.id);
        if (parent && isToggleBlock(parent)) {
          const siblings = parent.children as { id: string }[];
          const index = siblings.findIndex((sibling) => sibling.id === block.id);
          if (index < 0) return false;
          editor.transact(() => {
            editor.removeBlocks([block]);
            editor.setTextCursorPosition(index > 0 ? siblings[index - 1] : parent, "end");
          });
          return true;
        }
      }
      if (block.type === "paragraph") return false;

      const pendingInputRuleUndo = state.plugins.some(
        (plugin) => (plugin.spec as { isInputRules?: boolean }).isInputRules && plugin.getState(state),
      );
      if (!Array.isArray(block.content)) return false;
      if (isToggleBlock(block)) {
        if (!pendingInputRuleUndo && !isInlineBlockEmpty(block)) return false;
        return unwrapToggle(editor, block, pendingInputRuleUndo && block.type === "heading");
      }
      if (!pendingInputRuleUndo) {
        if (LIST_ITEM_TYPES.has(block.type) || !isInlineBlockEmpty(block)) return false;
      }
      if (block.children.length) return false;
      editor.updateBlock(block, { type: "paragraph", props: {} });
      editor.setTextCursorPosition(block, "start");
      return true;
    },
  },
});
