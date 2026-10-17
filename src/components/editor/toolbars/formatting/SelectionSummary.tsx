import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/SelectionSummary.tsx#messages:1">`
zh-Hans:
  tableSelection: "{{rows}} 行 × {{columns}} 列"
  blockCount: "{{count}} 块"
en:
  tableSelection: "{{rows}} rows × {{columns}} columns"
  blockCount: "{{count}} blocks"
`;
const t = createTranslator(messages);
import { useBlockNoteEditor, useEditorState } from "@blocknote/react";
import { CellSelection, selectedRect } from "prosemirror-tables";
import type { FormattingSelectionMode } from "./formattingCapabilities";
import { collectSelectedContentBlockIds } from "./selectionBlocks";

export function useSelectionSummary(mode: FormattingSelectionMode) {
  useLocale();
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
          return t("tableSelection", { rows: rect.bottom - rect.top, columns: rect.right - rect.left });
        } catch {
          return null;
        }
      }
      if (mode === "multiBlock") {
        const count = collectSelectedContentBlockIds(editor).size;
        return count > 1 ? t("blockCount", { count }) : null;
      }
      return null;
    },
  });
}

export function SelectionSummary({ label }: { label: string }) {
  useLocale();
  return <span className="goose-formatting-toolbar-summary">{label}</span>;
}
