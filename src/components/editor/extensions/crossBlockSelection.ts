import { CellSelection } from "prosemirror-tables";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";


export type BlockHit = {
  id: string;
  contentFrom: number;
  contentTo: number;
  selFrom: number;
  selTo: number;
  isTextblock: boolean;
};

export type SelectionRange = {
  from: number;
  to: number;
};

export type BlockContentRange = {
  from: number;
  to: number;
  isTextblock: boolean;
};

export type BlockLike = {
  id: string;
  children?: BlockLike[];
};

export type FlatBlock = {
  block: BlockLike;
  parentId: string | null;
};

export function hasPositiveBlockContentOverlap(
  selection: SelectionRange,
  content: BlockContentRange,
): boolean {
  if (selection.from >= selection.to) return false;

  if (content.isTextblock) {
    if (content.from < content.to) {
      return (
        Math.max(selection.from, content.from) <
        Math.min(selection.to, content.to)
      );
    }

    return selection.from <= content.from && selection.to >= content.to;
  }

  return (
    Math.max(selection.from, content.from) < Math.min(selection.to, content.to)
  );
}

export function getBlockContentRange(
  node: PMNode,
  pos: number,
): BlockContentRange | null {
  const content = node.firstChild;
  if (!content) return null;

  if (content.isTextblock) {
    const from = pos + 2;
    return { from, to: from + content.content.size, isTextblock: true };
  }

  const from = pos + 1;
  return { from, to: from + content.nodeSize, isTextblock: false };
}

export function collectSelectedBlocks(state: EditorState): BlockHit[] {
  if (
    state.selection instanceof CellSelection ||
    (state.selection as any).isCellSelection ||
    state.selection.constructor.name === "CellSelection"
  ) {
    return [];
  }

  const { from, to } = state.selection;
  const hits: BlockHit[] = [];

  state.doc.descendants((node: PMNode, pos: number) => {
    if (node.type.name !== "blockContainer") return true;
    const range = getBlockContentRange(node, pos);
    if (!range) return true;

    if (hasPositiveBlockContentOverlap({ from, to }, range)) {
      hits.push({
        id: String(node.attrs.id),
        contentFrom: range.from,
        contentTo: range.to,
        selFrom: Math.max(from, range.from),
        selTo: Math.min(to, range.to),
        isTextblock: range.isTextblock,
      });
    }
    return true;
  });

  return hits;
}

export function isOvershootingSingleTextblockSelection(
  state: EditorState,
): boolean {
  if (state.selection.empty) return false;
  if (!(state.selection instanceof TextSelection)) return false;

  const { $from, $to, from, to } = state.selection;
  if ($from.parent === $to.parent && $from.parent.isTextblock) return false;

  const hits = collectSelectedBlocks(state);
  if (hits.length !== 1) return false;

  const hit = hits[0];
  if (!hit.isTextblock) return false;
  if (hit.selTo <= hit.selFrom) return false;

  if (from >= hit.contentFrom && to <= hit.contentTo) return false;

  return true;
}

export function deleteOvershootingSingleBlockSelection(editor: any): boolean {
  const state = editor.prosemirrorState as EditorState;
  if (!isOvershootingSingleTextblockSelection(state)) return false;

  const hits = collectSelectedBlocks(state);
  const hit = hits[0];
  if (!hit || !hit.isTextblock || hit.selTo <= hit.selFrom) return false;

  editor.transact((tr: Transaction) => {
    tr.delete(hit.selFrom, hit.selTo);
    try {
      tr.setSelection(
        TextSelection.create(tr.doc, tr.mapping.map(hit.selFrom)),
      );
    } catch {
    }
  });
  return true;
}

export function flattenBlocks(
  blocks: readonly BlockLike[],
  parentId: string | null = null,
): FlatBlock[] {
  return blocks.flatMap((block) => [
    { block, parentId },
    ...flattenBlocks(block.children ?? [], block.id),
  ]);
}

export function hasSelectedAncestor(
  blockId: string,
  selectedIds: Set<string>,
  parentById: Map<string, string | null>,
) {
  let parentId = parentById.get(blockId) ?? null;
  while (parentId) {
    if (selectedIds.has(parentId)) return true;
    parentId = parentById.get(parentId) ?? null;
  }
  return false;
}

export function isBlockContentFullySelected(hit: {
  contentFrom: number;
  contentTo: number;
  selFrom: number;
  selTo: number;
}): boolean {
  if (hit.contentFrom === hit.contentTo) {
    return true;
  }
  return hit.selFrom <= hit.contentFrom && hit.selTo >= hit.contentTo;
}

export function hitSelectionContainsHardBreak(
  state: EditorState,
  hit: { selFrom: number; selTo: number },
): boolean {
  if (hit.selTo <= hit.selFrom) return false;
  let found = false;
  state.doc.nodesBetween(hit.selFrom, hit.selTo, (node) => {
    if (node.type.name === "hardBreak") {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

export function dispatchInlineDeletes(
  editor: any,
  state: EditorState,
  hits: BlockHit[],
): boolean {
  const textHits = hits.filter((h) => h.isTextblock && h.selTo > h.selFrom);
  if (textHits.length === 0) return false;

  let changed = false;
  editor.transact((tr: Transaction) => {
    for (let i = textHits.length - 1; i >= 0; i--) {
      const h = textHits[i];
      tr.delete(h.selFrom, h.selTo);
      changed = true;
    }
    if (!changed) return;
    const caret = tr.mapping.map(textHits[0].selFrom);
    try {
      tr.setSelection(TextSelection.create(tr.doc, caret));
    } catch {
    }
  });
  return changed;
}
