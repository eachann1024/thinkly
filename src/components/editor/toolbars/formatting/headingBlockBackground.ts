import type { Block, BlockNoteEditor } from "@blocknote/core";

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

function removeInlineBackgroundFromBlocks(
  editor: AnyEditor,
  blocks: AnyBlock[],
) {
  const view = editor.prosemirrorView;
  const markType = view.state.schema.marks.backgroundColor;
  if (!markType) return;

  const targetIDs = new Set(blocks.map((block) => block.id));
  const tr = view.state.tr;
  view.state.doc.descendants((node, pos) => {
    if (
      node.type.name !== "blockContainer" ||
      !targetIDs.has(String(node.attrs.id))
    ) {
      return true;
    }

    node.descendants((child, offset) => {
      if (child.isText && child.marks.some((mark) => mark.type === markType)) {
        const from = pos + 1 + offset;
        tr.removeMark(from, from + child.nodeSize, markType);
      }
      return true;
    });
    return false;
  });

  if (tr.docChanged) view.dispatch(tr);
}

export function applyHeadingBlockBackground(
  editor: AnyEditor,
  backgroundColor: string,
): boolean {
  const blocks = getToolbarTargetBlocks(editor);
  const state = getHeadingBackgroundSelectionState(blocks);
  if (!state.isHeadingSelection) return false;

  removeInlineBackgroundFromBlocks(editor, blocks);
  editor.transact(() => {
    for (const block of blocks) {
      editor.updateBlock(block.id, { props: { backgroundColor } });
    }
  });
  return true;
}
