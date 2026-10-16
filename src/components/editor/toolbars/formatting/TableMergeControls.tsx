import { mergeCells, splitCell } from "prosemirror-tables";
import { EditorAction } from "@/components/editor/ui/button";
import { Table2 } from "@/components/ui/icons";
import type { BlockNoteEditor } from "@blocknote/core";

export function hasTableMergeAction(editor: BlockNoteEditor<any, any, any>) {
  return editor.isEditable && (mergeCells(editor.prosemirrorState) || splitCell(editor.prosemirrorState));
}

export function TableMergeControls({ editor }: { editor: BlockNoteEditor<any, any, any> }) {
  if (!editor.isEditable) return null;
  const state = editor.prosemirrorState;
  const merge = mergeCells(state);
  const split = splitCell(state);
  if (!merge && !split) return null;
  const label = merge ? "合并单元格" : "拆分单元格";
  return <EditorAction type="button" className="goose-formatting-toolbar-text-control"
    aria-label={label} title={label}
    onClick={() => { editor.exec(merge ? mergeCells : splitCell); editor.focus(); }}>
    <Table2 aria-hidden="true" /><span>{label}</span>
  </EditorAction>;
}
