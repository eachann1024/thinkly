import type { BlockNoteEditor } from "@blocknote/core";
import type { Node as PMNode } from "prosemirror-model";
import type { SelectionBookmark } from "prosemirror-state";
import { GooseBlockSelection, isBlockNodeSelection, selectedBlockRoots } from "../extensions/blockSelectionModel";

type Editor = BlockNoteEditor<any, any, any>;
export type BlockMenuTarget = {
  doc: PMNode;
  blockIds: string[];
  bookmark: SelectionBookmark;
};

/** 菜单焦点可以改变实时选区，操作目标固定为打开时明确请求的块。 */
export function captureBlockMenuTarget(editor: Editor, requestedId: string): BlockMenuTarget | null {
  const state = editor.prosemirrorView.state;
  let roots = isBlockNodeSelection(state) ? selectedBlockRoots(state) : [];
  if (!roots.some(({ node }) => node.attrs.id === requestedId)) {
    roots = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name === "blockContainer" && node.attrs.id === requestedId) {
        roots.push({ node, pos });
        return false;
      }
      return true;
    });
  }
  if (!roots.length) return null;
  const selection = GooseBlockSelection.create(state.doc, roots[0].pos, roots[roots.length - 1].pos);
  return {
    doc: state.doc,
    blockIds: roots.map(({ node }) => String(node.attrs.id)),
    bookmark: selection.getBookmark(),
  };
}

export function resolveBlockMenuTarget(editor: Editor, target: BlockMenuTarget) {
  const view = editor.prosemirrorView;
  if (view.isDestroyed || !editor.isEditable || view.state.doc !== target.doc) return [];
  const blocks = target.blockIds.map((id) => editor.getBlock(id));
  return blocks.every((block) => Boolean(block)) ? blocks as NonNullable<(typeof blocks)[number]>[] : [];
}

export function restoreBlockMenuTarget(editor: Editor, target: BlockMenuTarget): boolean {
  if (!resolveBlockMenuTarget(editor, target).length) return false;
  const view = editor.prosemirrorView;
  const selection = target.bookmark.resolve(view.state.doc);
  if (!view.state.selection.eq(selection)) view.dispatch(view.state.tr.setSelection(selection));
  return true;
}
