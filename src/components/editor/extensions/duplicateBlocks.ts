import type { BlockNoteEditor } from "@blocknote/core";
import { getBlocksToMove } from "./moveBlockExtension";
import { getProtectedTitleBlockId } from "../utils/documentTitlePolicy";
import { GooseBlockSelection } from "./blockSelectionModel";

/** 新副本的整棵子树重新分配 ID，保留块属性、行内样式及媒体引用。 */
export function cloneBlocksForInsertion(blocks: unknown[]): any[] {
  return blocks.map((value) => {
    const block = value as Record<string, unknown>;
    const copy = { ...block };
    delete copy.id;
    if (Array.isArray(copy.children)) copy.children = cloneBlocksForInsertion(copy.children);
    return copy;
  });
}

export function duplicateSelectedBlocks(editor: BlockNoteEditor<any, any, any>): boolean {
  if (!editor.isEditable || editor.prosemirrorView.composing) return false;
  const titleId = getProtectedTitleBlockId(editor);
  const blocks = getBlocksToMove(editor).filter((block) => block.id !== titleId);
  if (blocks.length === 0) return true;
  const selectedIds = new Set(blocks.map((block) => block.id));
  const roots = blocks.filter((block) => {
    let parent = editor.getParentBlock(block);
    while (parent) {
      if (selectedIds.has(parent.id)) return false;
      parent = editor.getParentBlock(parent);
    }
    return true;
  });
  editor.transact((tr) => {
    const inserted = editor.insertBlocks(cloneBlocksForInsertion(roots), roots[roots.length - 1], "after");
    if (inserted.length === 0) return;
    const positions = new Map<string, number>();
    tr.doc.descendants((node, pos) => {
      if (node.type.name === "blockContainer") positions.set(String(node.attrs.id), pos);
    });
    const from = positions.get(inserted[0].id);
    const to = positions.get(inserted[inserted.length - 1].id);
    if (from !== undefined && to !== undefined) {
      tr.setSelection(GooseBlockSelection.create(tr.doc, from, to));
    }
  });
  return true;
}
