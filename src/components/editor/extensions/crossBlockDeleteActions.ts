import type { EditorState, Transaction } from "prosemirror-state";
import { safeSelectionDeletion } from "./selectionDelete";

export function deleteSelectedBlocks(editor: {
  prosemirrorState: EditorState;
  transact: (callback: (tr: Transaction) => void) => unknown;
}): boolean {
  const deletion = safeSelectionDeletion(editor.prosemirrorState);
  if (!deletion) return false;
  editor.transact((tr) => {
    for (const step of deletion.steps) tr.step(step);
    tr.setSelection(deletion.selection);
  });
  return true;
}
