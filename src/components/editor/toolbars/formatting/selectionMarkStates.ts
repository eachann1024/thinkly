import { useEditorState } from "@blocknote/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { forEachSelectedTextNode } from "./selectedTextNodes";

export const BOOLEAN_MARK_NAMES = [
  "bold",
  "italic",
  "strike",
  "underline",
  "code",
] as const;
export type BooleanMarkName = (typeof BOOLEAN_MARK_NAMES)[number];
export type BooleanMarkState = boolean | "mixed";

export function useSelectionMarkStates(editor: BlockNoteEditor<any, any, any>) {
  return useEditorState({
    editor,
    selector: ({ editor }) => {
      const { selection } = editor.prosemirrorState;
      const from = selection.from;
      const to = selection.to;

      const result: Record<BooleanMarkName, BooleanMarkState> = {
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        code: false,
      };

      if (from === to) {
        const marks = selection.$to.marks();
        for (const name of BOOLEAN_MARK_NAMES) {
          result[name] = marks.some((m: any) => m.type.name === name);
        }
        return result;
      }

      const counts: Record<BooleanMarkName, { with: number; total: number }> = {
        bold: { with: 0, total: 0 },
        italic: { with: 0, total: 0 },
        strike: { with: 0, total: 0 },
        underline: { with: 0, total: 0 },
        code: { with: 0, total: 0 },
      };

      forEachSelectedTextNode(editor.prosemirrorState, (node) => {
        for (const name of BOOLEAN_MARK_NAMES) {
          counts[name].total += 1;
          if (node.marks.some((mark) => mark.type.name === name)) {
            counts[name].with += 1;
          }
        }
      });

      for (const name of BOOLEAN_MARK_NAMES) {
        const count = counts[name];
        result[name] = count.with === 0 ? false
          : count.with === count.total ? true : "mixed";
      }
      return result;
    },
  });
}
