import type { BlockNoteEditor } from "@blocknote/core";
import { getBlocksToMove } from "../../extensions/moveBlockExtension";

type Editor = BlockNoteEditor<any, any, any>;
let session: { editor: Editor; ids: string[] } | undefined;
const pendingCleanup = new WeakMap<Editor, { preserveFocus: boolean }>();

export function beginColumnDrag(editor: Editor, id: string) {
  const selected = getBlocksToMove(editor);
  session = { editor, ids: selected.some((block) => block.id === id) ? selected.map((block) => block.id) : [id] };
  pendingCleanup.set(editor, { preserveFocus: false });
}

export function columnDragIds(editor: Editor) {
  return session?.editor === editor ? session.ids : undefined;
}

export function endColumnDrag(editor: Editor) {
  if (session?.editor === editor) session = undefined;
}

export function completeColumnDrop(editor: Editor) {
  const pending = pendingCleanup.get(editor);
  if (pending && session?.editor === editor) pending.preserveFocus = true;
  endColumnDrag(editor);
}

/** Native dragend and the deferred drop callback may both finish one drag. */
export function finishColumnDrag(editor: Editor, cleanup: () => void, allowFocus = true) {
  const pending = pendingCleanup.get(editor);
  if (!pending) return false;
  pendingCleanup.delete(editor);
  endColumnDrag(editor);
  cleanup();
  // BlockNote's blockDragEnd blurs its editor; restore only our successful drop.
  if (pending.preserveFocus && allowFocus) editor.prosemirrorView.focus();
  return true;
}
