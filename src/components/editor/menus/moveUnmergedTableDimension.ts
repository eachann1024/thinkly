import { Fragment, type Node } from "prosemirror-model";
import { closeHistory } from "prosemirror-history";
import { TextSelection } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";

function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Reuse immutable cells; the generic merged-table command recreates every cell. */
export function moveUnmergedTableDimension(
  view: EditorView, table: Node, start: number, rowAxis: boolean, from: number, to: number,
) {
  const originalRows = table.content.content;
  const orderedRows = rowAxis ? moved(originalRows, from, to) : originalRows;
  const rows = orderedRows.map((sourceRow, rowIndex) => {
    const destination = originalRows[rowIndex];
    if (rowAxis && sourceRow === destination) return destination;
    const orderedCells = rowAxis ? sourceRow.content.content : moved(sourceRow.content.content, from, to);
    // Header roles stay at their existing table positions, matching the generic command.
    const cells = orderedCells.map((cell, column) => {
      const type = destination.child(column).type;
      return cell.type === type ? cell : type.create(cell.attrs, cell.content, cell.marks);
    });
    return destination.copy(Fragment.fromArray(cells));
  });
  const next = table.copy(Fragment.fromArray(rows));
  const tr = view.state.tr.replaceWith(start - 1, start - 1 + table.nodeSize, next);
  const map = TableMap.get(next);
  const cell = map.map[rowAxis ? to * map.width : to];
  // Keep the caret in the moved content without painting a whole-table selection.
  tr.setSelection(TextSelection.near(tr.doc.resolve(start + cell + 1)));
  view.dispatch(closeHistory(tr).scrollIntoView());
  view.focus();
}
