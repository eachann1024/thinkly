import {
  getElementFromNode,
  getSelectedPlainTextContext,
} from "@/components/editor/utils/selection";

/** 只读取正文的当前选区，避免把搜索框或其他控件的选中文字带回搜索。 */
export function readSearchSelection(): string {
  if (document.activeElement?.closest("input, textarea, select, button"))
    return "";

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return "";

  const start = getElementFromNode(selection.getRangeAt(0).startContainer);
  const editor = start?.closest<HTMLElement>(".bn-editor");
  if (!editor?.closest(".workspace-editor-surface")) return "";

  return (getSelectedPlainTextContext(editor)?.selectedText ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}
