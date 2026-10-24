import type { EditorState, Transaction } from "prosemirror-state";

const suppressedEditors = new WeakSet<object>();

export function isSuggestionReconcileSuppressed(editor: object): boolean {
  return suppressedEditors.has(editor);
}

export function withSuggestionReconcileSuppressed<T>(editor: object, action: () => T): T {
  const alreadySuppressed = suppressedEditors.has(editor);
  suppressedEditors.add(editor);
  try { return action(); }
  finally { if (!alreadySuppressed) suppressedEditors.delete(editor); }
}

export function shouldReconcileSuggestionInput(
  transactions: readonly Transaction[], oldState: EditorState, newState: EditorState,
): boolean {
  if (!transactions.some((tr) => tr.docChanged)) return false;
  if (transactions.some((tr) => tr.getMeta("uiEvent") === "paste" || tr.getMeta("uiEvent") === "drop")) return false;
  const start = oldState.doc.content.findDiffStart(newState.doc.content);
  const end = oldState.doc.content.findDiffEnd(newState.doc.content);
  if (start === null || !end || !newState.selection.empty) return false;
  if (end.b <= start) return true;
  const inserted = newState.doc.textBetween(start, end.b, "\n", "\ufffc");
  if (transactions.some((tr) => tr.getMeta("composition") !== undefined)) {
    return /[@+\[\/、]/u.test(inserted);
  }
  return end.b - start === 1 && /^[@+\[\/、]$/u.test(inserted);
}
