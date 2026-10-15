import { createExtension, type BlockNoteEditor } from "@blocknote/core";
import { AllSelection, NodeSelection, TextSelection, type EditorState } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { getProtectedTitle } from "../utils/documentTitlePolicy";
import { GooseBlockSelection, currentBlockNode, isBlockNodeSelection } from "./blockSelectionModel";

type Editor = BlockNoteEditor<any, any, any>;

function selectBodyOrAll(editor: Editor, state: EditorState, startedInTitle: boolean): boolean {
  const title = getProtectedTitle(state);
  const group = state.doc.firstChild;
  const afterTitle = title ? title.pos + title.node.nodeSize : 0;
  const groupEnd = state.doc.content.size - 1;
  if (title && group && !startedInTitle && afterTitle < groupEnd) {
    const { selection } = state;
    if (!(selection.from <= afterTitle && selection.to >= groupEnd)) {
      const lastPos = groupEnd - group.lastChild!.nodeSize;
      editor.prosemirrorView.dispatch(state.tr.setSelection(
        GooseBlockSelection.create(state.doc, afterTitle, lastPos),
      ));
      return true;
    }
  }
  editor.prosemirrorView.dispatch(state.tr.setSelection(new AllSelection(state.doc)));
  return true;
}

function tableCellDepth(state: EditorState): number {
  const $from = state.selection.$from;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (["cell", "header_cell"].includes($from.node(depth).type.spec.tableRole ?? "")) return depth;
  }
  return -1;
}

export const gooseSelectAllExtension = createExtension({
  key: "goose-select-all",
  keyboardShortcuts: {
    "Mod-a": ({ editor }) => {
      if (editor.prosemirrorView.composing) return false;
      const state = editor.prosemirrorState;
      const { selection } = state;
      if (selection instanceof AllSelection) return true;
      const block = currentBlockNode(state);
      if (!block) return false;
      const title = getProtectedTitle(state);
      if (isBlockNodeSelection(state)) {
        return selectBodyOrAll(editor, state, block.pos === title?.pos);
      }
      const $from = selection.$from;
      const cellDepth = tableCellDepth(state);
      if (cellDepth >= 0) {
        const cellPos = $from.before(cellDepth);
        const cellFullySelected = selection instanceof TextSelection &&
          selection.from <= $from.start(cellDepth) && selection.to >= $from.end(cellDepth);
        if (cellFullySelected || selection instanceof CellSelection) {
          editor.prosemirrorView.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, block.pos)));
        } else {
          editor.prosemirrorView.dispatch(state.tr.setSelection(CellSelection.create(state.doc, cellPos)));
        }
        return true;
      }
      const content = block.node.firstChild;
      if (!content?.isTextblock) {
        editor.prosemirrorView.dispatch(state.tr.setSelection(GooseBlockSelection.create(state.doc, block.pos)));
        return true;
      }
      const start = block.pos + 2;
      const end = start + content.content.size;
      const fullySelected = selection instanceof TextSelection && selection.from <= start && selection.to >= end;
      if (fullySelected) return selectBodyOrAll(editor, state, block.pos === title?.pos);
      editor.prosemirrorView.dispatch(state.tr.setSelection(
        start === end ? GooseBlockSelection.create(state.doc, block.pos) : TextSelection.create(state.doc, start, end),
      ));
      return true;
    },
  },
});
