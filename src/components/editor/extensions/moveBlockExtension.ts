import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { currentBlockNode, findBlockPositions, GooseBlockSelection, isBlockNodeSelection, selectedBlockRoots } from "./blockSelectionModel";

type MoveDirection = "up" | "down";

type AnyEditor = BlockNoteEditor<any, any, any>;

type AnyBlock = {
  id: string;
  children: AnyBlock[];
};

type MovePlacement = {
  referenceBlock: { id: string } | string;
  placement: "before" | "after";
};

function getDocumentTitleId(editor: AnyEditor): string | undefined {
  return getProtectedTitleBlockId(editor);
}

export function getBlocksToMove(editor: AnyEditor): AnyBlock[] {
  if (isBlockNodeSelection(editor.prosemirrorState)) {
    const roots = selectedBlockRoots(editor.prosemirrorState);
    const current = currentBlockNode(editor.prosemirrorState);
    return (roots.length > 0 ? roots : current ? [current] : [])
      .map(({ node }) => editor.getBlock(String(node.attrs.id)))
      .filter(Boolean) as AnyBlock[];
  }
  return (
    (editor.getSelection()?.blocks as AnyBlock[] | undefined) ?? [
      editor.getTextCursorPosition().block as AnyBlock,
    ]
  );
}

function getMoveUpPlacement(
  editor: AnyEditor,
  prevBlock?: AnyBlock,
  parentBlock?: AnyBlock,
): MovePlacement | undefined {
  let referenceBlock: AnyBlock | undefined;
  let placement: "before" | "after" | undefined;

  if (!prevBlock) {
    if (parentBlock) {
      referenceBlock = parentBlock;
      placement = "before";
    }
  } else if (prevBlock.children.length > 0) {
    referenceBlock = prevBlock.children[prevBlock.children.length - 1];
    placement = "after";
  } else {
    referenceBlock = prevBlock;
    placement = "before";
  }

  if (!referenceBlock || !placement) {
    return undefined;
  }

  return { referenceBlock, placement };
}

export function wouldMoveBeforeDocumentTitle(
  editor: AnyEditor,
  blocks: AnyBlock[],
  direction: MoveDirection,
): boolean {
  if (direction !== "up") return false;

  const titleId = getDocumentTitleId(editor);
  if (!titleId) return false;

  const sourceBlock = blocks[0];
  if (!sourceBlock) return false;

  const placement = getMoveUpPlacement(
    editor,
    editor.getPrevBlock(sourceBlock) as AnyBlock | undefined,
    editor.getParentBlock(sourceBlock) as AnyBlock | undefined,
  );

  if (!placement) return false;

  const referenceId =
    typeof placement.referenceBlock === "string"
      ? placement.referenceBlock
      : placement.referenceBlock.id;

  return placement.placement === "before" && referenceId === titleId;
}

export function moveSelectedBlocksByShortcut(
  editor: AnyEditor,
  direction: MoveDirection,
): boolean {
  try {
    if (editor.prosemirrorView.composing) return false;
    const blocks = getBlocksToMove(editor);
    if (blocks.length === 0) return true;

    const titleId = getDocumentTitleId(editor);
    if (titleId && blocks.some((block) => block.id === titleId)) {
      return true;
    }

    if (wouldMoveBeforeDocumentTitle(editor, blocks, direction)) {
      return true;
    }

    if (editor.prosemirrorState.selection instanceof GooseBlockSelection) {
      const first = blocks[0];
      const last = blocks[blocks.length - 1];
      const next = editor.getNextBlock(last);
      const parent = editor.getParentBlock(last);
      const placement = direction === "up"
        ? getMoveUpPlacement(editor, editor.getPrevBlock(first) as AnyBlock | undefined,
            editor.getParentBlock(first) as AnyBlock | undefined)
        : next
          ? next.children.length > 0
            ? { referenceBlock: next.children[0], placement: "before" as const }
            : { referenceBlock: next, placement: "after" as const }
          : parent ? { referenceBlock: parent, placement: "after" as const } : undefined;
      if (!placement) return true;
      editor.transact((tr) => {
        editor.removeBlocks(blocks);
        editor.insertBlocks(blocks, placement.referenceBlock, placement.placement);
        const positions = findBlockPositions(tr.doc, new Set([first.id, last.id]));
        const start = positions.get(first.id), end = positions.get(last.id);
        if (start !== undefined && end !== undefined) {
          tr.setSelection(GooseBlockSelection.create(tr.doc, start, end));
        }
      });
    } else if (direction === "up") editor.moveBlocksUp();
    else editor.moveBlocksDown();
  } catch {
  }

  return true;
}

export const gooseMoveBlockExtension = createExtension({
  key: "goose-move-block",
  keyboardShortcuts: {
    "Mod-Shift-ArrowUp": ({ editor }) => moveSelectedBlocksByShortcut(editor, "up"),
    "Mod-Shift-ArrowDown": ({ editor }) => moveSelectedBlocksByShortcut(editor, "down"),
    "Alt-ArrowUp": ({ editor }) => moveSelectedBlocksByShortcut(editor, "up"),
    "Alt-ArrowDown": ({ editor }) =>
      moveSelectedBlocksByShortcut(editor, "down"),
  },
});
