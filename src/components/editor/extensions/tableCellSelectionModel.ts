import {
  NodeSelection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "prosemirror-state";
import type { Node, ResolvedPos } from "prosemirror-model";
import { CellSelection, inSameTable } from "prosemirror-tables";

export function cellPosFromResolved($pos: ResolvedPos): number | null {
  for (let d = $pos.depth; d > 0; d -= 1) {
    const role = $pos.node(d).type.spec?.tableRole;
    if (role === "cell" || role === "header_cell") return $pos.before(d);
  }
  return null;
}

function findTableDepth($pos: ResolvedPos): number {
  for (let d = $pos.depth; d > 0; d -= 1) {
    if ($pos.node(d).type.spec?.tableRole === "table") return d;
  }
  return -1;
}

export function tablePosFromResolved($pos: ResolvedPos): number | null {
  const depth = findTableDepth($pos);
  return depth >= 0 ? $pos.before(depth) : null;
}

export function textSelectionAt(
  doc: ResolvedPos["doc"],
  anchor: number,
  head: number,
) {
  try {
    return TextSelection.create(doc, anchor, head);
  } catch {
    return TextSelection.between(doc.resolve(anchor), doc.resolve(head));
  }
}

/** 一端在表格内、另一端在表外（或另一张表）时，选区已经跨出表格。 */
export function selectionCrossesTableBoundary(
  $a: ResolvedPos,
  $b: ResolvedPos,
): boolean {
  const aTable = tablePosFromResolved($a);
  const bTable = tablePosFromResolved($b);
  if (aTable == null && bTable == null) return false;
  return aTable !== bTable;
}

export function isSpanningTableSelection(sel: {
  empty?: boolean;
  $anchor: ResolvedPos;
  $head: ResolvedPos;
}): boolean {
  if (sel.empty) return false;
  if (selectionCrossesTableBoundary(sel.$anchor, sel.$head)) return true;
  if (!(sel instanceof TextSelection)) return false;

  // 两端都在表格外时，选区仍可能完整跨过中间的表格块。
  // 两端位于同一张表格时则保留原有单元格选区行为。
  if (
    tablePosFromResolved(sel.$anchor) != null ||
    tablePosFromResolved(sel.$head) != null
  ) {
    return false;
  }

  const from = Math.min(sel.$anchor.pos, sel.$head.pos);
  const to = Math.max(sel.$anchor.pos, sel.$head.pos);
  let containsTable = false;
  sel.$anchor.doc.nodesBetween(from, to, (node) => {
    if (node.type.spec?.tableRole !== "table") return !containsTable;
    containsTable = true;
    return false;
  });
  return containsTable;
}

/** 表外一端停在原处，表内一端停在指针所在格子的文字位置，不扩成整表。 */
export function createSelectionLeavingTable(
  $inTable: ResolvedPos,
  $outside: ResolvedPos,
  inTableIsAnchor = true,
) {
  const doc = $inTable.doc;
  const inside = $inTable.pos;
  const outside = $outside.pos;
  return textSelectionAt(
    doc,
    inTableIsAnchor ? inside : outside,
    inTableIsAnchor ? outside : inside,
  );
}

export function selectionBetweenPointer(
  doc: ResolvedPos["doc"],
  anchor: number,
  head: number,
) {
  const max = doc.content.size;
  const from = Math.max(0, Math.min(anchor, max));
  const to = Math.max(0, Math.min(head, max));
  const $anchor = doc.resolve(from);
  const $head = doc.resolve(to);
  return createTableAwareSelection($anchor, $head) ?? textSelectionAt(doc, from, to);
}

export function createTableAwareSelection(
  $anchor: ResolvedPos,
  $head: ResolvedPos,
) {
  const anchorCell = cellPosFromResolved($anchor);
  const headCell = cellPosFromResolved($head);
  if (
    anchorCell != null &&
    headCell != null &&
    anchorCell !== headCell &&
    sameTableCells($anchor.doc, anchorCell, headCell)
  ) {
    return CellSelection.create($anchor.doc, anchorCell, headCell);
  }
  if (!selectionCrossesTableBoundary($anchor, $head)) return null;
  const anchorInTable = tablePosFromResolved($anchor) != null;
  const inTable = anchorInTable ? $anchor : $head;
  const outside = inTable === $anchor ? $head : $anchor;
  return createSelectionLeavingTable(inTable, outside, anchorInTable);
}

function sameTableCells(
  doc: ResolvedPos["doc"],
  aPos: number,
  bPos: number,
): boolean {
  try {
    return inSameTable(doc.resolve(aPos), doc.resolve(bPos));
  } catch {
    return false;
  }
}

export function promoteCrossCellTextSelection(state: EditorState) {
  const sel = state.selection;
  if (!(sel instanceof TextSelection) || sel.empty) return null;
  if (isSpanningTableSelection(sel)) return null;
  const anchorCell = cellPosFromResolved(sel.$anchor);
  const headCell = cellPosFromResolved(sel.$head);
  if (anchorCell == null || headCell == null || anchorCell === headCell) {
    return null;
  }
  return state.tr.setSelection(
    CellSelection.create(state.doc, anchorCell, headCell),
  );
}

export function restoreSpanningSelection(
  trs: readonly Transaction[],
  newState: EditorState,
) {
  for (let i = trs.length - 1; i >= 0; i -= 1) {
    const sel = trs[i].selection;
    if (!isSpanningTableSelection(sel)) continue;
    if (newState.selection.eq(sel)) return null;
    return newState.tr.setSelection(sel);
  }
  return null;
}

export function keepSpanningSelection(tr: Transaction, state: EditorState) {
  if (!tr.selectionSet || !isSpanningTableSelection(state.selection)) {
    return true;
  }
  const next = tr.selection;
  if (isSpanningTableSelection(next) || next.empty) return true;
  if (next instanceof CellSelection) return false;
  if (
    next instanceof NodeSelection &&
    next.node.type.spec?.tableRole === "table"
  ) {
    return false;
  }
  return !(next instanceof TextSelection);
}

export type CoveredCell = { pos: number; size: number };

function textblockSpan(node: Node, pos: number): { from: number; to: number } | null {
  let from = Infinity;
  let to = -1;
  node.descendants((child, offset) => {
    if (!child.isTextblock) return !child.isLeaf;
    const start = pos + 1 + offset + 1;
    const end = start + child.content.size;
    if (start < from) from = start;
    if (end > to) to = end;
    return false;
  });
  return to < 0 ? null : { from, to };
}

/** 选区完整盖住的格子。指针所在、只盖住一部分文字的格子不在这里。 */
export function fullyCoveredCells(
  doc: ResolvedPos["doc"],
  from: number,
  to: number,
  paintRow?: (row: Node, pos: number) => boolean,
): CoveredCell[] {
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  const cells: CoveredCell[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    const role = node.type.spec?.tableRole;
    if (role === "table") return true;
    if (role === "row") return paintRow ? paintRow(node, pos) : true;
    if (role === "cell" || role === "header_cell") {
      const span = textblockSpan(node, pos);
      if (span && from <= span.from && to >= span.to) {
        cells.push({ pos, size: node.nodeSize });
      }
      return false;
    }
    return !node.isTextblock && !node.isLeaf;
  });
  return cells;
}

/** 表外拖选命中或跨过表格后接管，普通文本拖选继续使用原生行为。 */
export function shouldTakeOverOutsideTableDrag(
  draggingDoc: boolean,
  currentTablePos: number | null,
  spansTable = false,
): boolean {
  return draggingDoc || currentTablePos != null || spansTable;
}
