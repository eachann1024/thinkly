import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, TextSelection, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { CellSelection, TableMap } from "prosemirror-tables";
import type { Node } from "prosemirror-model";
import {
  createTableAwareSelection,
  fullyCoveredCells,
  keepSpanningSelection,
  restoreSpanningSelection,
  promoteCrossCellTextSelection,
} from "./tableCellSelectionModel";
import { createTableCellSelectionView } from "./tableCellSelectionView";
import { tableWindowMeta, visibleRowIndexes } from "./tableWindowExtension";
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
const ANCHOR_FRAME = "goose-table-selection-anchor";
const tableRects = new WeakMap<Node, Map<number, CellRect>>();

export function tableCellPaintsAnchorFrame(anchorPos: number, headPos: number): boolean {
  return anchorPos === headPos;
}

function selectionFrameClass(edges: Array<string | false>, anchorFrame: boolean): string {
  return [
    ...edges.filter((edge): edge is string => Boolean(edge)).map((edge) => `goose-table-selection-${edge}`),
    anchorFrame && ANCHOR_FRAME,
  ].filter(Boolean).join(" ");
}

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

function windowedCellDecorations(state: EditorState, selection: CellSelection): DecorationSet | null {
  const table = selection.$anchorCell.node(-1);
  const tableStart = selection.$anchorCell.start(-1);
  const tablePos = selection.$anchorCell.before(-1);
  const visible = visibleRowIndexes(state, table, tablePos);
  if (!visible) return null;
  const map = TableMap.get(table);
  const rect = map.rectBetween(
    selection.$anchorCell.pos - tableStart,
    selection.$headCell.pos - tableStart,
  );
  const rows = new Set<number>();
  for (let row = Math.max(rect.top, visible.start); row < Math.min(rect.bottom, visible.end); row += 1) rows.add(row);
  if (rect.top <= 0 && rect.bottom > 0) rows.add(0);
  for (const pin of visible.pins) {
    for (let row = pin - 1; row <= pin + 1; row += 1) {
      if (row >= rect.top && row < rect.bottom) rows.add(row);
    }
  }
  const anchorPos = selection.$anchorCell.pos;
  const singleCell = tableCellPaintsAnchorFrame(anchorPos, selection.$headCell.pos);
  const decorations: Decoration[] = [];
  rows.forEach((row) => {
    for (let col = rect.left; col < rect.right; col += 1) {
      const rel = map.map[row * map.width + col];
      if (rel == null) continue;
      const pos = tableStart + rel;
      const node = state.doc.nodeAt(pos);
      if (!node) continue;
      const edges = [
        row === rect.top && "top",
        col + 1 === rect.right && "right",
        row + 1 === rect.bottom && "bottom",
        col === rect.left && "left",
      ].filter(Boolean);
      decorations.push(Decoration.node(pos, pos + node.nodeSize, {
        class: selectionFrameClass(edges, pos === anchorPos && singleCell),
      }));
    }
  });
  return DecorationSet.create(state.doc, decorations);
}

function tableCellSelectionDecorations(state: EditorState) {
  if (!(state.selection instanceof CellSelection)) return spanningCellDecorations(state);
  return windowedCellDecorations(state, state.selection) ?? fullCellDecorations(state);
}

function fullCellDecorations(state: EditorState) {
  const selection = state.selection as CellSelection;
  const table = selection.$anchorCell.node(-1);
  const tableStart = selection.$anchorCell.start(-1);
  const map = TableMap.get(table);
  const rects = getCellRects(table, map);
  const cells: { pos: number; size: number }[] = [];
  selection.forEachCell((node, pos) => {
    cells.push({ pos, size: node.nodeSize });
  });
  const selected = new Set(cells.map(({ pos }) => pos - tableStart));
  const anchorPos = selection.$anchorCell.pos;
  const singleCell = tableCellPaintsAnchorFrame(anchorPos, selection.$headCell.pos);
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
    const edges = [
      columns.every((col) => outside(top - 1, col)) && "top",
      rows.every((row) => outside(row, right)) && "right",
      columns.every((col) => outside(bottom, col)) && "bottom",
      rows.every((row) => outside(row, left - 1)) && "left",
    ].filter(Boolean);
    return Decoration.node(pos, pos + size, {
      class: selectionFrameClass(edges, pos === anchorPos && singleCell),
    });
  });
  return DecorationSet.create(state.doc, decorations);
}

export function tableSelectionFrameClasses(state: EditorState): string[] {
  return tableCellSelectionDecorations(state).find().map((decoration) => {
    const attrs = (decoration as unknown as { type?: { attrs?: { class?: string } } }).type?.attrs;
    return attrs?.class ?? "";
  });
}

const SPAN_CELL_CLASS = "goose-table-span-cell";
const PLUGIN_KEY = new PluginKey<DecorationSet>("goose-table-cell-selection");

function liveRowFilter(state: EditorState, from: number, to: number) {
  const windowed = new Set<number>();
  const live = new Set<number>();
  let found = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.spec?.tableRole !== "table") return;
    const visible = visibleRowIndexes(state, node, pos);
    if (!visible) return false;
    found = true;
    let offset = pos + 1;
    let index = 0;
    node.forEach((row) => {
      windowed.add(offset);
      const pinned = visible.pins.some((pin) => index >= pin - 1 && index <= pin + 1);
      if (index === 0 || (index >= visible.start && index < visible.end) || pinned) live.add(offset);
      offset += row.nodeSize;
      index += 1;
    });
    return false;
  });
  if (!found) return undefined;
  return (_row: Node, pos: number) => !windowed.has(pos) || live.has(pos);
}

function spanningCellDecorations(state: EditorState) {
  const sel = state.selection;
  if (!(sel instanceof TextSelection) || sel.empty || sel.$from.sameParent(sel.$to)) {
    return DecorationSet.empty;
  }
  const paintRow = sel.to - sel.from > 4000 ? liveRowFilter(state, sel.from, sel.to) : undefined;
  const cells = fullyCoveredCells(state.doc, sel.from, sel.to, paintRow);
  if (cells.length === 0) return DecorationSet.empty;
  return DecorationSet.create(
    state.doc,
    cells.map(({ pos, size }) =>
      Decoration.node(pos, pos + size, { class: SPAN_CELL_CLASS }),
    ),
  );
}

const tableCellSelectionPlugin = new Plugin({
  key: PLUGIN_KEY,
  state: {
    init: (_config, state) => tableCellSelectionDecorations(state),
    apply: (tr, decorations, oldState, newState) =>
      !tr.docChanged && oldState.selection.eq(newState.selection) && !tr.getMeta(tableWindowMeta)
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
