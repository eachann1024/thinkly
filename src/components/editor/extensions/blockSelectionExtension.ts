import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { shouldOpenSlashSuggestionMenu } from "../utils/slashMenuPolicy";
import { GooseBlockSelection, adjacentBlock, currentBlockNode, selectedBlockRoots, isBlockNodeSelection } from "./blockSelectionModel";
import { deleteSelectionSafely } from "./selectionDelete";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";

const SLASH_TRIGGERS = new Set(["/", "、"]);

export function typeSlashAtSelectedBlockStart(
  editor: BlockNoteEditor<any, any, any>,
  text: string,
): boolean {
  if (!editor.isEditable || !SLASH_TRIGGERS.has(text)) return false;
  const state = editor.prosemirrorState;
  if (!isBlockNodeSelection(state)) return false;
  const block = currentBlockNode(state);
  const content = block?.node.firstChild;
  if (!block || !content?.isTextblock) return false;
  const start = block.pos + 2;
  const probe = state.tr.setSelection(TextSelection.create(state.doc, start));
  if (!shouldOpenSlashSuggestionMenu(probe, editor, { allowSlashMenuOnFirstBlock: false })) return false;
  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, start));
    tr.insertText(text, start);
  });
  editor.getExtension(SuggestionMenu)?.openSuggestionMenu(text);
  return true;
}

export const gooseBlockSelectionExtension = createExtension(({ editor }) => ({
  key: "goose-block-selection",
  prosemirrorPlugins: [new Plugin({
    key: new PluginKey("goose-block-selection"),
    props: {
      decorations(state) {
        if (!(state.selection instanceof GooseBlockSelection)) return null;
        return DecorationSet.create(state.doc, selectedBlockRoots(state).map(({ node, pos }) =>
          Decoration.node(pos, pos + node.nodeSize, { class: "ProseMirror-selectednode", "data-goose-block-selected": "true" }),
        ));
      },
      handleKeyDown(view, event) {
        if (view.composing || event.isComposing || event.keyCode === 229) return false;
        const primary = isPlatformPrimaryModifierEvent(event);
        if (primary || event.altKey || event.ctrlKey || event.metaKey) return false;
        if (editor.getExtension(SuggestionMenu)?.shown()) return false;
        const state = view.state;
        const block = currentBlockNode(state);
        if (!block) return false;
        if (event.key === "Escape") {
          view.dispatch(state.tr.setSelection(GooseBlockSelection.create(state.doc, block.pos)).scrollIntoView());
          return true;
        }
        if (!isBlockNodeSelection(state)) return false;
        if (event.key === "Backspace" || event.key === "Delete") {
          return editor.isEditable && deleteSelectionSafely(view);
        }
        if (event.key === "/" || event.key === "、") {
          return typeSlashAtSelectedBlockStart(editor, event.key) || true;
        }
        if (event.key === "Enter") {
          const content = block.node.firstChild;
          if (content?.isTextblock) {
            view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, block.pos + 2)).scrollIntoView());
          }
          return true;
        }
        const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 :
          ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
        if (direction) {
          const target = adjacentBlock(state.doc, block.pos, block.node.nodeSize, direction);
          if (!target) return true;
          const anchor = event.shiftKey && state.selection instanceof GooseBlockSelection
            ? state.selection.anchorBlockPos : block.pos;
          view.dispatch(state.tr.setSelection(GooseBlockSelection.create(
            state.doc, event.shiftKey ? anchor : target.pos, target.pos,
          )).scrollIntoView());
          return true;
        }
        return event.key.length === 1;
      },
      handleTextInput(view, _from, _to, text) {
        if (!isBlockNodeSelection(view.state)) return false;
        if (text === "/" || text === "、") return typeSlashAtSelectedBlockStart(editor, text);
        return true;
      },
    },
  })],
}));
