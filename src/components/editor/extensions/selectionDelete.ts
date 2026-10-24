import { AllSelection, NodeSelection, Selection, type EditorState, type Transaction } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";
import { getProtectedTitle } from "../utils/documentTitlePolicy";
import {
  collectSelectedBlocks, isBlockContentFullySelected,
  isOvershootingSingleTextblockSelection, hitSelectionContainsHardBreak,
} from "./crossBlockSelection";
import { isBlockNodeSelection, selectedBlockRoots } from "./blockSelectionModel";
import { isMediaNodeSelection, MEDIA_KEYBOARD_DELETE_META } from "./mediaBlockDelete";

type DeletionRange = { from: number; to: number };

export function safeSelectionDeletion(state: EditorState): Transaction | null {
  const { selection } = state;
  if (selection.empty || selection instanceof CellSelection) return null;
  const title = getProtectedTitle(state);
  const ranges: DeletionRange[] = [];
  if (isBlockNodeSelection(state)) {
    let roots = selection instanceof NodeSelection
      ? selection.node.type.name === "blockContainer"
        ? [{ pos: selection.from, node: selection.node }]
        : []
      : selectedBlockRoots(state);
    if (roots.length === 0 && selection instanceof NodeSelection) {
      const $from = selection.$from;
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if ($from.node(depth).type.name === "blockContainer") {
          roots = [{ pos: $from.before(depth), node: $from.node(depth) }];
          break;
        }
      }
    }
    for (const { node, pos } of roots) {
      ranges.push(title?.pos === pos
        ? { from: title.contentFrom, to: title.contentTo }
        : { from: pos, to: pos + node.nodeSize });
    }
  } else {
    const hits = collectSelectedBlocks(state);
    if (hits.length < 2 && !(selection instanceof AllSelection) &&
      !isOvershootingSingleTextblockSelection(state)) return null;
    const allFullySelected = hits.every(isBlockContentFullySelected);
    const keepHardBreakPair = !allFullySelected && hits.length === 2 &&
      hits.every((hit) => hit.isTextblock) &&
      hits.some((hit) => hitSelectionContainsHardBreak(state, hit));
    const hitsById = new Map(hits.map((hit) => [hit.id, hit]));
    const containers = new Map<string, DeletionRange & { node: typeof state.doc }>();
    state.doc.descendants((node, pos) => {
      if (node.type.name === "blockContainer") {
        containers.set(String(node.attrs.id), { from: pos, to: pos + node.nodeSize, node });
      }
    });
    for (const hit of hits) {
      const container = containers.get(hit.id);
      const fullySelected = isBlockContentFullySelected(hit);
      let descendantsSelected = true;
      container?.node.descendants((node) => {
        if (node.type.name !== "blockContainer") return;
        const descendant = hitsById.get(String(node.attrs.id));
        if (!descendant || !isBlockContentFullySelected(descendant)) descendantsSelected = false;
      });
      const remove = hit.id !== title?.id && fullySelected && descendantsSelected &&
        (!hit.isTextblock || (!keepHardBreakPair &&
          (allFullySelected || !hitSelectionContainsHardBreak(state, hit))));
      if (remove && container) ranges.push(container);
      else if (hit.isTextblock) ranges.push({ from: hit.selFrom, to: hit.selTo });
    }
  }
  const roots = ranges.filter((range, index) => range.to > range.from &&
    !ranges.some((other, otherIndex) => otherIndex !== index &&
      other.from <= range.from && other.to >= range.to &&
      (other.from < range.from || other.to > range.to || otherIndex < index)));
  if (roots.length === 0) {
    return title && selection.from <= title.pos && selection.to >= title.pos + title.node.nodeSize
      ? state.tr.setSelection(Selection.near(state.doc.resolve(title.contentFrom)))
      : null;
  }
  roots.sort((a, b) => b.from - a.from);
  const tr = state.tr;
  if (isMediaNodeSelection(selection)) tr.setMeta(MEDIA_KEYBOARD_DELETE_META, true);
  for (const range of roots) tr.delete(range.from, range.to);
  const caret = Math.min(tr.mapping.map(roots[roots.length - 1].from), tr.doc.content.size);
  tr.setSelection(Selection.near(tr.doc.resolve(caret)));
  return tr;
}

export function deleteSelectionSafely(view: EditorView): boolean {
  if (view.state.selection.empty) return false;
  view.dispatch((safeSelectionDeletion(view.state) ?? view.state.tr.deleteSelection()).scrollIntoView());
  return true;
}
