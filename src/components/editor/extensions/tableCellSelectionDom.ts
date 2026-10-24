import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { CellSelection, tableEditingKey } from "prosemirror-tables";
import {
  cellPosFromResolved,
  createTableAwareSelection,
  isSpanningTableSelection,
  tablePosFromResolved,
} from "./tableCellSelectionModel";

export const GRID_CLASS = "goose-table-cell-grid";
export const SPAN_CLASS = "goose-table-span-select";

type DomNodeLike = {
  nodeName?: string;
  parentNode?: DomNodeLike | null;
};

function asDomNodeLike(target: EventTarget | Node | null): DomNodeLike | null {
  if (!target || typeof target !== "object") return null;
  return target as DomNodeLike;
}

export function tableCellFromTarget(
  target: EventTarget | Node | null,
  root?: Node | null,
): HTMLTableCellElement | null {
  let node = asDomNodeLike(target);
  const stop = root ?? null;
  while (node && node !== stop) {
    const name = node.nodeName;
    if (name === "TD" || name === "TH") {
      return node as HTMLTableCellElement;
    }
    node = node.parentNode ?? null;
  }
  return null;
}

export function closestTable(
  cell: HTMLTableCellElement | null,
): HTMLTableElement | null {
  return cell?.closest("table") ?? null;
}

export function tableRowUnderPointer(
  table: HTMLTableElement,
  clientX: number,
  clientY: number,
): HTMLTableRowElement | null {
  const rows = table.rows;
  if (!rows.length) return null;
  const bounds = table.getBoundingClientRect();
  if (clientX < bounds.left || clientX > bounds.right) return null;
  let nearest: HTMLTableRowElement | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rect = row.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (clientY >= rect.top && clientY <= rect.bottom) return row;
    const distance = clientY < rect.top ? rect.top - clientY : clientY - rect.bottom;
    if (distance < nearestDistance) {
      nearest = row;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function isCrossCellPointer(
  startEl: EventTarget | null,
  currentEl: EventTarget | null,
): boolean {
  const startCell = tableCellFromTarget(startEl);
  const currentCell = tableCellFromTarget(currentEl);
  return startCell != null && currentCell != null && startCell !== currentCell;
}

export function cellPosFromDom(
  view: EditorView,
  cell: HTMLTableCellElement,
): number | null {
  try {
    const pos = view.posAtDOM(cell, 0);
    return cellPosFromResolved(view.state.doc.resolve(pos));
  } catch {
    return null;
  }
}

function getDomSelection(view: EditorView): Selection | null {
  const root = view.root as { getSelection?: () => Selection | null };
  return root.getSelection?.() ?? window.getSelection();
}

export function nativeSelectionSpansCells(view: EditorView): boolean {
  const sel = getDomSelection(view);
  if (!sel || sel.isCollapsed) return false;
  const anchorCell = tableCellFromTarget(sel.anchorNode, view.dom);
  const focusCell = tableCellFromTarget(sel.focusNode, view.dom);
  return Boolean(anchorCell && focusCell && anchorCell !== focusCell);
}

export function clearNativeSelection(view: EditorView) {
  getDomSelection(view)?.removeAllRanges();
}

export function eventInsideEditor(view: EditorView, event: Event): boolean {
  const target = event.target;
  return target instanceof Node && view.dom.contains(target);
}

export function tryDispatchCellSelection(
  view: EditorView,
  anchorPos: number,
  headPos: number,
): boolean {
  try {
    const current = view.state.selection;
    if (
      current instanceof CellSelection &&
      current.$anchorCell.pos === anchorPos &&
      current.$headCell.pos === headPos
    ) {
      return true;
    }
    const selection = CellSelection.create(view.state.doc, anchorPos, headPos);
    if (!view.state.selection.eq(selection)) {
      view.dispatch(view.state.tr.setSelection(selection));
    }
    return true;
  } catch {
    return false;
  }
}

export function tryDispatchDocSelection(
  view: EditorView,
  anchorPos: number,
  headPos: number,
): boolean {
  try {
    const $anchor = view.state.doc.resolve(anchorPos);
    const $head = view.state.doc.resolve(headPos);
    const selection =
      createTableAwareSelection($anchor, $head) ??
      TextSelection.between($anchor, $head);
    if (view.state.selection.eq(selection)) return true;
    const tr = view.state.tr.setSelection(selection);
    tr.setMeta(tableEditingKey, -1);
    view.dispatch(tr);
    return true;
  } catch {
    return false;
  }
}

function getHitDocument(view: EditorView): Document | ShadowRoot {
  const root = view.root as Document | ShadowRoot | null;
  return root && "elementFromPoint" in root ? root : document;
}

export function cellsFromPoint(
  view: EditorView,
  clientX: number,
  clientY: number,
  startTable: HTMLTableElement | null,
): HTMLTableCellElement | null {
  const doc = getHitDocument(view);
  const stack = doc.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!el) continue;
    const cell = tableCellFromTarget(el, view.dom);
    if (cell && (!startTable || closestTable(cell) === startTable)) return cell;
  }
  return null;
}

export function coordsPos(view: EditorView, event: MouseEvent): number | null {
  return docPosAtClient(view, event.clientX, event.clientY);
}

function hitRoot(view: EditorView): Document | ShadowRoot {
  const root = view.root as Document | ShadowRoot | null;
  return root && "elementFromPoint" in root ? root : document;
}

function textPosInCell(
  view: EditorView,
  cell: HTMLTableCellElement,
  clientX: number,
): number | null {
  let origin: number;
  try {
    origin = view.posAtDOM(cell, 0);
  } catch {
    return null;
  }
  const $pos = view.state.doc.resolve(origin);
  let start = -1;
  let end = -1;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (!$pos.node(depth).isTextblock) continue;
    start = $pos.start(depth);
    end = $pos.end(depth);
    break;
  }
  if (start < 0 || start >= end) return origin;
  let lo = start;
  let hi = end;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    let left: number;
    try {
      left = view.coordsAtPos(mid).left;
    } catch {
      return origin;
    }
    if (left <= clientX) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function docPosAtClient(
  view: EditorView,
  clientX: number,
  clientY: number,
): number | null {
  const hit = view.posAtCoords({ left: clientX, top: clientY });
  const direct = hit?.pos ?? null;
  if (direct != null && cellPosFromResolved(view.state.doc.resolve(direct)) != null) {
    return direct;
  }
  const cell = tableCellFromTarget(
    hitRoot(view).elementFromPoint(clientX, clientY),
    view.dom,
  );
  if (!cell) return direct;
  const rect = cell.getBoundingClientRect();
  const left = rect.left + 1;
  const right = rect.right - 1;
  const top = rect.top + 1;
  const bottom = rect.bottom - 1;
  const x = Math.min(Math.max(clientX, left), Math.max(left, right));
  const y = Math.min(Math.max(clientY, top), Math.max(top, bottom));
  if (x !== clientX || y !== clientY) {
    const nudged = view.posAtCoords({ left: x, top: y });
    if (
      nudged &&
      cellPosFromResolved(view.state.doc.resolve(nudged.pos)) != null
    ) {
      return nudged.pos;
    }
  }
  return textPosInCell(view, cell, x) ?? direct;
}

export function isDocPosInTable(
  view: EditorView,
  docPos: number,
  tablePos: number | null,
): boolean {
  if (tablePos == null) return false;
  try {
    return tablePosFromResolved(view.state.doc.resolve(docPos)) === tablePos;
  } catch {
    return false;
  }
}

export function syncSelectionClasses(
  view: EditorView,
  draggingCells = false,
  draggingDoc = false,
) {
  const spanning =
    draggingDoc || isSpanningTableSelection(view.state.selection);
  view.dom.classList.toggle(
    GRID_CLASS,
    !spanning &&
      (draggingCells || view.state.selection instanceof CellSelection),
  );
  if (!spanning) view.dom.classList.remove(SPAN_CLASS);
}
