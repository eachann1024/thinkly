import { Slice } from "prosemirror-model";
import { NodeSelection, type EditorState } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { isWholeTableCellSelection } from "../utils/selection";
import { currentBlockNode } from "./blockSelectionModel";

export function getCurrentBlockNodeSelection(state: EditorState): NodeSelection | null {
  if (!state.selection.empty) return null;
  const block = currentBlockNode(state);
  return block && NodeSelection.isSelectable(block.node)
    ? NodeSelection.create(state.doc, block.pos)
    : null;
}

export const STRUCTURED_COPY_CONTENT_TYPES = new Set([
  "table", "codeBlock", "image", "video", "file", "divider", "audio",
]);

export function getTableBlockContainerSelection(state: EditorState): NodeSelection | null {
  const selection = state.selection;
  if (!(selection instanceof CellSelection)) return null;
  const $cell = selection.$anchorCell;
  for (let depth = $cell.depth; depth > 0; depth -= 1) {
    if ($cell.node(depth).type.name === "blockContainer") {
      return NodeSelection.create(state.doc, $cell.before(depth));
    }
  }
  return null;
}

export function shouldCopyClipboardWithFormatting(state: EditorState): boolean {
  return !state.selection.empty || getCurrentBlockNodeSelection(state) !== null;
}

export function resolveCopyBlockSelection(state: EditorState): NodeSelection | Slice | null {
  const { selection } = state;
  if (selection.empty) return getCurrentBlockNodeSelection(state);
  if (selection instanceof CellSelection && isWholeTableCellSelection(state)) {
    return getTableBlockContainerSelection(state);
  }
  if (selection instanceof NodeSelection) {
    if (selection.node.type.name === "blockContainer") return selection;
    if (selection.node.type.spec.group === "blockContent") {
      const parentPos = selection.from - 1;
      if (state.doc.nodeAt(parentPos)?.type.name === "blockContainer") {
        return NodeSelection.create(state.doc, parentPos);
      }
    }
  }
  return selection.content();
}
