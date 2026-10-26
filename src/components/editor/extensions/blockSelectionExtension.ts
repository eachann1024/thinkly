import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { Plugin, PluginKey, TextSelection, NodeSelection, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { shouldOpenSlashSuggestionMenu } from "../utils/slashMenuPolicy";
import { GooseBlockSelection, adjacentBlock, currentBlockNode, selectedBlockRoots, isBlockNodeSelection } from "./blockSelectionModel";
import { deleteSelectionSafely } from "./selectionDelete";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { createSparseBlockHandleDecorations, sparseBlockDecorationTargetsAtPositions } from "./sparseBlockHandleDecorations";

const decorationsByDocument = new WeakMap<EditorState["doc"], {
  selection: EditorState["selection"];
  decorations: DecorationSet;
}>();

export function resolveBlockSelectionDecorations(state: EditorState): DecorationSet | null {
  const selection = state.selection;
  const cached = decorationsByDocument.get(state.doc);
  if (cached?.selection === selection) return cached.decorations;
  const blocks = selection instanceof GooseBlockSelection ? selectedBlockRoots(state) :
    selection instanceof NodeSelection && selection.node.type.name === "blockContainer"
      ? [{ node: selection.node, pos: selection.from }] : [];
  if (!blocks.length) return null;
  const decorations = selection instanceof NodeSelection
    ? createSparseBlockHandleDecorations(state.doc, sparseBlockDecorationTargetsAtPositions(state.doc, blocks), () => ({
      class: "ProseMirror-selectednode", "data-goose-block-selected": "true",
    }))
    : DecorationSet.create(state.doc, blocks.map(({ node, pos }) =>
    Decoration.node(pos, pos + node.nodeSize, {
      class: "ProseMirror-selectednode", "data-goose-block-selected": "true",
    }),
  ));
  decorationsByDocument.set(state.doc, { selection, decorations });
  return decorations;
}

export function restoreTextSelectionOnBlockClick(view: EditorView, _pos: number, event: MouseEvent): boolean {
  if (event.button !== 0 || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey || view.composing || !view.editable) return false;
  const { state } = view;
  if (!(state.selection instanceof NodeSelection) || state.selection.node.type.name !== "blockContainer") return false;
  const target = event.target instanceof Element ? event.target : null;
  const inline = target?.closest(".bn-inline-content");
  if (!inline || !view.dom.contains(inline) || target?.closest(
    'a, button, input, textarea, select, td, th, [role="button"], [contenteditable="false"], [data-inline-content-type="pageMention"]',
  )) return false;
  const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!hit || !state.doc.resolve(hit.pos).parent.inlineContent) return false;
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, hit.pos)).setMeta("addToHistory", false).setMeta("pointer", true));
  view.focus();
  return true;
}

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
      decorations: resolveBlockSelectionDecorations,
      handleClick: restoreTextSelectionOnBlockClick,
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
