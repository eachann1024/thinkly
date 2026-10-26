import type { BlockNoteEditor } from "@blocknote/core";
import { applyHeadingBlockBackground } from "./headingBlockBackground";
import { materializeSelectedBlockColors } from "./blockColorActions";

export function applySelectionFormatColors(
  editor: BlockNoteEditor<any, any, any>,
  colors: { textColor?: string; backgroundColor?: string },
): void {
  const textColor = colors.textColor ?? "default";
  const backgroundColor = colors.backgroundColor ?? "default";
  editor.transact((tr) => {
    materializeSelectedBlockColors(editor);
    const headingBackground = applyHeadingBlockBackground(editor, backgroundColor);
    for (const [property, value] of Object.entries({ textColor, backgroundColor })) {
      const type = editor.pmSchema.marks[property];
      if (!type) continue;
      const mark = value !== "default" && !(property === "backgroundColor" && headingBackground)
        ? type.create({ stringValue: value }) : undefined;
      if (tr.selection.empty) {
        tr.removeStoredMark(type);
        if (mark) tr.addStoredMark(mark);
      } else {
        for (const range of tr.selection.ranges) {
          tr.removeMark(range.$from.pos, range.$to.pos, type);
          if (mark) tr.addMark(range.$from.pos, range.$to.pos, mark);
        }
      }
    }
  });
}
