import type { EditorState, Transaction } from "prosemirror-state";

const suppressedEditors = new WeakSet<object>();

export function isSuggestionReconcileSuppressed(editor: object): boolean {
  return suppressedEditors.has(editor);
}

/** 自定义粘贴不一定带 PM 的 paste 元数据；仅在同步粘贴调用期间阻止补开。 */
export function withSuggestionReconcileSuppressed<T>(editor: object, action: () => T): T {
  const alreadySuppressed = suppressedEditors.has(editor);
  suppressedEditors.add(editor);
  try { return action(); }
  finally { if (!alreadySuppressed) suppressedEditors.delete(editor); }
}

/** 补开只用于输入触发符、输入法提交或删除查询，不能从粘贴/整块替换中猜测意图。 */
export function shouldReconcileSuggestionInput(
  transactions: readonly Transaction[], oldState: EditorState, newState: EditorState,
): boolean {
  if (!transactions.some((tr) => tr.docChanged)) return false;
  if (transactions.some((tr) => tr.getMeta("uiEvent") === "paste" || tr.getMeta("uiEvent") === "drop")) return false;
  const start = oldState.doc.content.findDiffStart(newState.doc.content);
  const end = oldState.doc.content.findDiffEnd(newState.doc.content);
  if (start === null || !end || !newState.selection.empty) return false;
  // 纯删除仍允许把删空的查询重新打开。
  if (end.b <= start) return true;
  const inserted = newState.doc.textBetween(start, end.b, "\n", "\ufffc");
  if (transactions.some((tr) => tr.getMeta("composition") !== undefined)) {
    return /[@+\[\/、]/u.test(inserted);
  }
  return end.b - start === 1 && /^[@+\[\/、]$/u.test(inserted);
}
