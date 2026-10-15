import type { Node as PMNode } from "prosemirror-model";
import type { EditorState, SelectionBookmark } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export type EditorSelectionSnapshot = {
  doc: PMNode;
  bookmark: SelectionBookmark;
};

export function snapshotEditorSelection(state: EditorState): EditorSelectionSnapshot {
  return { doc: state.doc, bookmark: state.selection.getBookmark() };
}

/** 异步剪贴板返回前发生了文档变更时停止操作，绝不把旧坐标用于新内容。 */
export function restoreEditorSelection(
  view: EditorView,
  snapshot: EditorSelectionSnapshot,
): boolean {
  if (view.isDestroyed || view.state.doc !== snapshot.doc) return false;
  const selection = snapshot.bookmark.resolve(view.state.doc);
  if (!view.state.selection.eq(selection)) {
    view.dispatch(view.state.tr.setSelection(selection));
  }
  return true;
}
