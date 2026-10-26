import type { BlockNoteEditor } from "@blocknote/core";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { collectSelectedContentBlockIds } from "../toolbars/formatting/selectionBlocks";

export function getHandleConversionBlockIds(editor: BlockNoteEditor<any, any, any>, blockId: string): string[] {
  if (editor.prosemirrorState.selection instanceof NodeSelection) return [blockId];
  const ids = collectSelectedContentBlockIds(editor);
  return ids.has(blockId) ? [...ids] : [blockId];
}

export function syncHandleTextSelection(editor: BlockNoteEditor<any, any, any>): void {
  const view = editor.prosemirrorView;
  const selection = view.dom.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode ||
    !view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return;
  try {
    const state = editor.prosemirrorState;
    const next = TextSelection.between(
      state.doc.resolve(view.posAtDOM(selection.anchorNode, selection.anchorOffset)),
      state.doc.resolve(view.posAtDOM(selection.focusNode, selection.focusOffset)),
    );
    if (collectSelectedContentBlockIds(editor, { doc: state.doc, selection: next }).size > 1 &&
      !state.selection.eq(next)) {
      view.dispatch(state.tr.setSelection(next).setMeta("addToHistory", false));
    }
  } catch {
  }
}
