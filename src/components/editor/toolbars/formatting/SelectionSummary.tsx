import { useBlockNoteEditor, useEditorState } from "@blocknote/react";
import { CellSelection, selectedRect } from "prosemirror-tables";
import type { FormattingSelectionMode } from "./formattingCapabilities";
import { collectSelectedContentBlockIds } from "./selectionBlocks";

export function useSelectionSummary(mode: FormattingSelectionMode) {
  const editor = useBlockNoteEditor();
  return useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        mode === "cellText" ||
        (mode === "cellGrid" &&
          editor.prosemirrorState.selection instanceof CellSelection)
      ) {
        try {
          const rect = selectedRect(editor.prosemirrorState);
          return `${rect.bottom - rect.top} 行 × ${rect.right - rect.left} 列`;
        } catch {
          return null;
        }
      }
      if (mode === "multiBlock") {
        const count = collectSelectedContentBlockIds(editor).size;
        return count > 1 ? `${count} 块` : null;
      }
      return null;
    },
  });
}

export function SelectionSummary({ label }: { label: string }) {
  return <span className="goose-formatting-toolbar-summary">{label}</span>;
}
