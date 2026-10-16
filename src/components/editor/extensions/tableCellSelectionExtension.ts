import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { CellSelection, TableMap } from "prosemirror-tables";
import type { Node } from "prosemirror-model";
import {
  createTableAwareSelection,
  keepSpanningSelection,
  restoreSpanningSelection,
  promoteCrossCellTextSelection,
} from "./tableCellSelectionModel";
import { createTableCellSelectionView } from "./tableCellSelectionView";
export {
  cellPosFromResolved,
  selectionCrossesTableBoundary,
  isSpanningTableSelection,
  createSelectionLeavingTable,
  createTableAwareSelection,
  promoteCrossCellTextSelection,
  shouldTakeOverOutsideTableDrag,
} from "./tableCellSelectionModel";
export { isCrossCellPointer } from "./tableCellSelectionDom";

type CellRect = { top: number; right: number; bottom: number; left: number };
const tableRects = new WeakMap<Node, Map<number, CellRect>>();

function getCellRects(table: Node, map: TableMap) {
  const cached = tableRects.get(table);
  if (cached) return cached;
  const rects = new Map<number, CellRect>();
  map.map.forEach((pos, index) => {
    const col = index % map.width;
    const row = Math.floor(index / map.width);
    const rect = rects.get(pos);
    if (rect) {
      rect.right = Math.max(rect.right, col + 1);
      rect.bottom = row + 1;
    } else {
      rects.set(pos, { top: row, right: col + 1, bottom: row + 1, left: col });
    }
  });
  tableRects.set(table, rects);
  return rects;
}

/** Immutable table nodes let pointer selection reuse a single grid scan. */
function tableCellSelectionDecorations(state: EditorState) {
  if (!(state.selection instanceof CellSelection)) return DecorationSet.empty;
  const table = state.selection.$anchorCell.node(-1);
  const tableStart = state.selection.$anchorCell.start(-1);
  const map = TableMap.get(table);
  const rects = getCellRects(table, map);
  const cells: { pos: number; size: number }[] = [];
  state.selection.forEachCell((node, pos) => {
    cells.push({ pos, size: node.nodeSize });
  });
  const selected = new Set(cells.map(({ pos }) => pos - tableStart));
  const anchorPos = state.selection.$anchorCell.pos;
  const decorations = cells.map(({ pos, size }) => {
    const { top, right, bottom, left } = rects.get(pos - tableStart)!;
    const outside = (row: number, col: number) =>
      row < 0 ||
      row >= map.height ||
      col < 0 ||
      col >= map.width ||
      !selected.has(map.map[row * map.width + col]);
    const columns = Array.from({ length: right - left }, (_, i) => left + i);
    const rows = Array.from({ length: bottom - top }, (_, i) => top + i);
    // ponytail: partial merged-cell edges keep fill only; segment strokes need
    // measured DOM geometry, not grid fractions (columns/rows can be unequal).
    const edges = [
      columns.every((col) => outside(top - 1, col)) && "top",
      rows.every((row) => outside(row, right)) && "right",
      columns.every((col) => outside(bottom, col)) && "bottom",
      rows.every((row) => outside(row, left - 1)) && "left",
    ].filter(Boolean);
    return Decoration.node(pos, pos + size, {
      class: [
        ...edges.map((edge) => `goose-table-selection-${edge}`),
        pos === anchorPos && "goose-table-selection-anchor",
      ].filter(Boolean).join(" "),
    });
  });
  return DecorationSet.create(state.doc, decorations);
}

const PLUGIN_KEY = new PluginKey<DecorationSet>("goose-table-cell-selection");

const tableCellSelectionPlugin = new Plugin({
  key: PLUGIN_KEY,
  state: {
    init: (_config, state) => tableCellSelectionDecorations(state),
    apply: (tr, decorations, oldState, newState) =>
      !tr.docChanged && oldState.selection.eq(newState.selection)
        ? decorations
        : tableCellSelectionDecorations(newState),
  },
  filterTransaction(tr, state) {
    return keepSpanningSelection(tr, state);
  },
  props: {
    decorations: (state) => PLUGIN_KEY.getState(state) ?? DecorationSet.empty,
    createSelectionBetween(_view, $anchor, $head) {
      return createTableAwareSelection($anchor, $head);
    },
  },
  appendTransaction(trs, _oldState, newState) {
    return (
      restoreSpanningSelection(trs, newState) ??
      promoteCrossCellTextSelection(newState)
    );
  },
  view: createTableCellSelectionView,
});

export const gooseTableCellSelectionExtension = createExtension({
  key: "goose-table-cell-selection",
  prosemirrorPlugins: [tableCellSelectionPlugin],
});
