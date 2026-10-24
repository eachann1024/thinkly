import { createExtension } from "@blocknote/core";
import { addRowAfter, goToNextCell, isInTable } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import type { EditorState } from "prosemirror-state";

const handleTableTab = (view: EditorView, direction: 1 | -1): boolean => {
  if (!isInTable(view.state)) return false;

  if (goToNextCell(direction)(view.state, view.dispatch)) {
    view.focus();
    return true;
  }

  if (direction === 1 && addRowAfter(view.state, view.dispatch)) {
    goToNextCell(1)(view.state, view.dispatch);
    view.focus();
    return true;
  }

  return true;
};

export function shouldUseCodeBlockTabIndent(editor: {
  getSelection?: () => { blocks: { type: string }[] } | undefined;
  getTextCursorPosition: () => { block: { type: string } };
}): boolean {
  try {
    const selectedBlocks = editor.getSelection?.()?.blocks;
    if (selectedBlocks && selectedBlocks.length > 1) return false;
    return editor.getTextCursorPosition().block.type === "codeBlock";
  } catch {
    return false;
  }
}

type HierarchyBlock = {
  id: string;
  type: string;
  props?: { level?: number };
  children?: HierarchyBlock[];
};

type BlockLocation = {
  siblings: readonly HierarchyBlock[];
  index: number;
  parentId: string | null;
};

function findBlockLocation(
  blocks: readonly HierarchyBlock[],
  id: string,
  parentId: string | null = null,
): BlockLocation | null {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.id === id) return { siblings: blocks, index, parentId };
    const nested = findBlockLocation(block.children ?? [], id, block.id);
    if (nested) return nested;
  }
  return null;
}

function hasValidNestTarget(editor: {
  prosemirrorState?: EditorState;
  document?: readonly HierarchyBlock[];
  getSelection?: () => { blocks: HierarchyBlock[] } | undefined;
}): boolean {
  const document = editor.document;
  const selectedBlocks = editor.getSelection?.()?.blocks;
  if (!document || !selectedBlocks || selectedBlocks.length === 0) return true;

  const locations = selectedBlocks.map((block) =>
    findBlockLocation(document, block.id),
  );
  if (locations.some((location) => !location)) return false;

  const first = locations[0]!;
  if (first.index === 0) return false;

  if (
    locations.some(
      (location, offset) =>
        location!.parentId !== first.parentId ||
        location!.siblings !== first.siblings ||
        location!.index !== first.index + offset,
    )
  ) {
    return false;
  }

  const previousSibling = first.siblings[first.index - 1];
  const isPageTitle =
    first.parentId === null &&
    !!editor.prosemirrorState &&
    previousSibling.id === getProtectedTitleBlockId(editor as { prosemirrorState: EditorState });

  return !isPageTitle;
}

export function adjustSelectedBlockHierarchy(
  editor: {
    prosemirrorState?: EditorState;
    document?: readonly HierarchyBlock[];
    getSelection?: () => { blocks: HierarchyBlock[] } | undefined;
    canNestBlock: () => boolean;
    canUnnestBlock: () => boolean;
    nestBlock: () => void;
    unnestBlock: () => void;
  },
  direction: "nest" | "unnest",
): boolean {
  if (direction === "nest") {
    if (hasValidNestTarget(editor) && editor.canNestBlock()) {
      editor.nestBlock();
    }
  } else if (editor.canUnnestBlock()) {
    editor.unnestBlock();
  }

  return true;
}

export const gooseTabBehaviorExtension = createExtension({
  key: "goose-tab-behavior",
  keyboardShortcuts: {
    Tab: ({ editor }) => {
      const view = editor.prosemirrorView;
      if (view && handleTableTab(view, 1)) {
        return true;
      }
      if (shouldUseCodeBlockTabIndent(editor)) {
        return false;
      }
      return adjustSelectedBlockHierarchy(editor, "nest");
    },
    "Shift-Tab": ({ editor }) => {
      const view = editor.prosemirrorView;
      if (view && handleTableTab(view, -1)) {
        return true;
      }
      if (shouldUseCodeBlockTabIndent(editor)) {
        return false;
      }
      return adjustSelectedBlockHierarchy(editor, "unnest");
    },
  },
});
