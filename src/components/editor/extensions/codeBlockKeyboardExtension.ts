import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import {
  getCodeBlockSelection,
  insertCodeBlockText,
} from "../blocks/code/codeBlockTransactions";

function exitCodeBlock(editor: BlockNoteEditor) {
  const code = getCodeBlockSelection(editor.prosemirrorState.selection);
  if (!code) return false;
  editor.transact((tr) => {
    closeHistory(tr);
    const { block } = editor.getTextCursorPosition();
    const [inserted] = editor.insertBlocks(
      [{ type: "paragraph", content: "" }],
      block,
      "after",
    );
    if (inserted) editor.setTextCursorPosition(inserted, "start");
    tr.scrollIntoView();
  });
  return true;
}

function moveAcrossCodeBoundary(
  editor: BlockNoteEditor,
  view: EditorView,
  event: KeyboardEvent,
) {
  const directions = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  } as const;
  const direction = directions[event.key as keyof typeof directions];
  if (
    !direction ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return false;
  }
  const { selection, doc } = view.state;
  const code = getCodeBlockSelection(selection);
  if (!code || !selection.empty || !view.endOfTextblock(direction))
    return false;

  const backward = direction === "up" || direction === "left";
  const boundary = backward
    ? selection.$head.before(code.depth)
    : selection.$head.after(code.depth);
  let target = Selection.findFrom(doc.resolve(boundary), backward ? -1 : 1);
  if (!target) return direction === "down" ? exitCodeBlock(editor) : true;

  if (
    (direction === "up" || direction === "down") &&
    target instanceof TextSelection
  ) {
    const from = view.coordsAtPos(selection.head);
    const edge = view.coordsAtPos(target.head);
    const hit = view.posAtCoords({
      left: from.left,
      top: (edge.top + edge.bottom) / 2,
    });
    if (hit) {
      const $hit = doc.resolve(hit.pos);
      if ($hit.sameParent(target.$head))
        target = TextSelection.create(doc, hit.pos);
    }
  }
  view.dispatch(view.state.tr.setSelection(target).scrollIntoView());
  return true;
}

export const gooseCodeBlockKeyboardExtension = createExtension(
  ({ editor }) => ({
    key: "goose-code-block-keyboard",
    prosemirrorPlugins: [
      new Plugin({
        props: {
          handleDOMEvents: {
            beforeinput(view, event) {
              const input = event as InputEvent;
              if (
                !view.editable || !input.cancelable || view.composing ||
                input.isComposing || input.defaultPrevented ||
                input.inputType !== "insertText" || !input.data ||
                !getCodeBlockSelection(view.state.selection)
              ) return false;
              // Use the editor selection for plain code input. Chromium's
              // editable ranges can escape or miss a React node-view selection.
              event.preventDefault();
              view.dispatch(view.state.tr.insertText(input.data).scrollIntoView());
              return true;
            },
          },
          handleKeyDown(view, event) {
            if (
              !view.editable ||
              view.composing ||
              event.isComposing ||
              event.keyCode === 229
            ) {
              return false;
            }
            if (!getCodeBlockSelection(view.state.selection)) return false;
            if (event.key === "Enter" && !event.altKey) {
              if (event.metaKey || event.ctrlKey || event.shiftKey)
                return exitCodeBlock(editor);
              const tr = view.state.tr;
              insertCodeBlockText(tr, "\n");
              view.dispatch(tr.scrollIntoView());
              return true;
            }
            return moveAcrossCodeBoundary(editor, view, event);
          },
        },
      }),
    ],
  }),
)();
