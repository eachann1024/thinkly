import { createExtension } from "@blocknote/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { storedMarksForCodeEdge } from "./inlineCodeWordBoundary";
import { inlineCodeEdgeAt } from "./inlineCodeCaretModel";
import {
  handleArrow,
  handleDelete,
  handleWordDelete,
  handleWordMove,
} from "./inlineCodeCaretKeyboard";
import { inlineCodeElementAt, syncCaretSide } from "./inlineCodeCaretDom";
export {
  edgeGraphemeLength,
  inlineCodeEdgeAt,
  inlineCodeEdgeArrowAction,
  shouldKeepInlineCodeDomCaret,
  type InlineCodeEdge,
  type InlineCodeEdgeArrowAction,
} from "./inlineCodeCaretModel";
export { handleArrow } from "./inlineCodeCaretKeyboard";


function inlineCodeCaretPlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        if (event.isComposing || view.composing) return false;
        if (event.metaKey) return false;

        if (event.altKey && !event.ctrlKey) {
          if (event.key === "Backspace" || event.keyCode === 8) {
            return handleWordDelete(view, "backward");
          }
          if (event.key === "Delete" || event.keyCode === 46) {
            return handleWordDelete(view, "forward");
          }
          if (event.key === "ArrowLeft" || event.keyCode === 37) {
            return handleWordMove(view, "backward", event.shiftKey);
          }
          if (event.key === "ArrowRight" || event.keyCode === 39) {
            return handleWordMove(view, "forward", event.shiftKey);
          }
        }

        if (event.shiftKey || event.ctrlKey || event.altKey) return false;
        if (event.key === "ArrowLeft" || event.keyCode === 37) {
          return handleArrow(view, "left");
        }
        if (event.key === "ArrowRight" || event.keyCode === 39) {
          return handleArrow(view, "right");
        }
        if (event.key === "Backspace" || event.keyCode === 8) {
          return handleDelete(view, "backward");
        }
        if (event.key === "Delete" || event.keyCode === 46) {
          return handleDelete(view, "forward");
        }
        return false;
      },
      handleDOMEvents: {
        beforeinput(view: EditorView, event: Event): boolean {
          if (view.composing) return false;
          const input = event as InputEvent;
          if (input.inputType === "deleteWordBackward") {
            if (!handleWordDelete(view, "backward")) return false;
            event.preventDefault();
            return true;
          }
          if (input.inputType === "deleteWordForward") {
            if (!handleWordDelete(view, "forward")) return false;
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
      handleClick(view: EditorView, pos: number, event: MouseEvent): boolean {
        if (event.button !== 0) return false;

        const { state } = view;
        const codeType = state.schema.marks.code;
        if (!codeType) return false;

        const $pos = state.doc.resolve(pos);
        const edge = inlineCodeEdgeAt($pos, codeType);
        if (!edge) return false;

        const code = inlineCodeElementAt(view, pos, edge);
        if (!code) return false;

        const rect = code.getBoundingClientRect();
        const inside = event.clientX > rect.left && event.clientX < rect.right;
        view.dispatch(
          state.tr
            .setSelection(TextSelection.create(state.doc, pos))
            .setStoredMarks(storedMarksForCodeEdge($pos, codeType, inside)),
        );
        return true;
      },
    },
    view() {
      return { update: syncCaretSide };
    },
  });
}

export const gooseInlineCodeCaretExtension = createExtension({
  key: "goose-inline-code-caret",
  prosemirrorPlugins: [inlineCodeCaretPlugin()],
});
