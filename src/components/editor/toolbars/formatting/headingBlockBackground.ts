import type { Block, BlockNoteEditor } from "@blocknote/core";
import { setBlockColor } from "./blockColorActions";

export const MIXED_HEADING_BACKGROUND = "__mixed__";

type AnyEditor = BlockNoteEditor<any, any, any>;
type AnyBlock = Block<any, any, any>;

export function getToolbarTargetBlocks(editor: AnyEditor): AnyBlock[] {
  return (
    editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]
  );
}

export function getHeadingBackgroundSelectionState(blocks: AnyBlock[]): {
  isHeadingSelection: boolean;
  backgroundColor: string;
} {
  if (blocks.length === 0 || blocks.some((block) => block.type !== "heading")) {
    return { isHeadingSelection: false, backgroundColor: "default" };
  }

  const colors = new Set(
    blocks.map((block) => String(block.props.backgroundColor ?? "default")),
  );
  return {
    isHeadingSelection: true,
    backgroundColor:
      colors.size === 1 ? [...colors][0] : MIXED_HEADING_BACKGROUND,
  };
}

export function applyHeadingBlockBackground(
  editor: AnyEditor,
  backgroundColor: string,
): boolean {
  const blocks = getToolbarTargetBlocks(editor);
  const state = getHeadingBackgroundSelectionState(blocks);
  if (!state.isHeadingSelection) return false;

  editor.transact(() => {
    for (const block of blocks) {
      setBlockColor(editor, block.id, "backgroundColor", backgroundColor);
    }
  });
  return true;
}
