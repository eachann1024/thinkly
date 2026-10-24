import type { EditorState, Transaction } from "prosemirror-state";
import { safeSelectionDeletion } from "./selectionDelete";
import { MEDIA_KEYBOARD_DELETE_META } from "./mediaBlockDelete";

export function deleteSelectedBlocks(editor: {
  prosemirrorState: EditorState;
  transact: (callback: (tr: Transaction) => void) => unknown;
}): boolean {
  const deletion = safeSelectionDeletion(editor.prosemirrorState);
  if (!deletion) return false;
  editor.transact((tr) => {
    if (deletion.getMeta(MEDIA_KEYBOARD_DELETE_META)) tr.setMeta(MEDIA_KEYBOARD_DELETE_META, true);
    for (const step of deletion.steps) tr.step(step);
    tr.setSelection(deletion.selection.getBookmark().resolve(tr.doc));
  });
  return true;
}
