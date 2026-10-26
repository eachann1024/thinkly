import { useEditorState } from "@blocknote/react";
import type { BlockNoteEditor } from "@blocknote/core";
import {
  getHeadingBackgroundSelectionState,
  getToolbarTargetBlocks,
} from "./headingBlockBackground";
import { MIXED } from "./colorPalette";
import { forEachSelectedTextNode } from "./selectedTextNodes";
import type { ResolvedPos } from "prosemirror-model";

function inheritedColor(position: ResolvedPos, property: "textColor" | "backgroundColor"): string {
  for (let depth = position.depth; depth > 0; depth--) {
    const color = position.node(depth).attrs[property];
    if (color && color !== "default") return color;
  }
  return "default";
}

export function useSelectionColorState(editor: BlockNoteEditor<any, any, any>) {
  return useEditorState({
    editor,
    selector: ({ editor }) => {
      const { selection } = editor.prosemirrorState;
      const headingBackground = getHeadingBackgroundSelectionState(
        getToolbarTargetBlocks(editor),
      );
      const textColors = new Set<string>();
      const bgColors = new Set<string>();
      const from = selection.from;
      const to = selection.to;

      if (from === to) {
        const marks = editor.prosemirrorState.storedMarks ?? selection.$to.marks();
        const tc = marks.find((m: any) => m.type.name === "textColor");
        const bc = marks.find((m: any) => m.type.name === "backgroundColor");
        return {
          textColor: (tc?.attrs.stringValue as string | undefined) ?? inheritedColor(selection.$to, "textColor"),
          backgroundColor: headingBackground.isHeadingSelection
            ? headingBackground.backgroundColor
            : ((bc?.attrs.stringValue as string | undefined) ?? inheritedColor(selection.$to, "backgroundColor")),
        };
      }

      forEachSelectedTextNode(editor.prosemirrorState, (node, pos) => {
        const position = editor.prosemirrorState.doc.resolve(pos);
        const tc = node.marks.find((m: any) => m.type.name === "textColor");
        const bc = node.marks.find(
          (m: any) => m.type.name === "backgroundColor",
        );
        textColors.add(
          (tc?.attrs.stringValue as string | undefined) ?? inheritedColor(position, "textColor"),
        );
        bgColors.add(
          (bc?.attrs.stringValue as string | undefined) ?? inheritedColor(position, "backgroundColor"),
        );
      });

      return {
        textColor:
          textColors.size === 0
            ? "default"
            : textColors.size === 1
              ? [...textColors][0]
              : MIXED,
        backgroundColor: headingBackground.isHeadingSelection
          ? headingBackground.backgroundColor
          : bgColors.size === 0
            ? "default"
            : bgColors.size === 1
              ? [...bgColors][0]
              : MIXED,
      };
    },
  });
}
