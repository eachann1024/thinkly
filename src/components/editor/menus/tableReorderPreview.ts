import { moveUnmergedTableDimension } from "./moveUnmergedTableDimension";
import { tableReorderLayer } from "./tableReorderLayer";
import { getNodeById } from "@blocknote/core";
import { CellSelection, moveTableColumn, moveTableRow, TableMap } from "prosemirror-tables";
import { closeHistory } from "prosemirror-history";
import type { EditorView } from "prosemirror-view";

export function tableReorderPreview(
  view: EditorView,
  blockId: string,
  axis: "row" | "column",
  from: number,
  grip: HTMLElement,
) {
  const block = getNodeById(blockId, view.state.doc);
  const node = block?.node.firstChild;
  if (!block || node?.type.spec.tableRole !== "table") return;
  const start = block.posBeforeNode + 2;
  const table = (view.nodeDOM(start - 1) as HTMLElement | null)?.closest("table") ??
    (view.domAtPos(start + 1).node as HTMLElement).closest("table");
  if (!table) return;
  const rowAxis = axis === "row";
  const map = TableMap.get(node);
  const tracks = rowAxis ? Array.from(table.rows) : Array.from(table.querySelectorAll("col"));
  if (tracks.length !== (rowAxis ? map.height : map.width)) return;
  const rects = tracks.map((track) => track.getBoundingClientRect());
  const lows = rects.map((rect) => rowAxis ? rect.top : rect.left);
  const highs = rects.map((rect) => rowAxis ? rect.bottom : rect.right);
  const size = highs[from] - lows[from];
  const scale = table.getBoundingClientRect().width / table.offsetWidth || 1;
  const unmerged = new Set(map.map).size === map.map.length;
  const cells: { selector: string; low: number; high: number }[] = [];
  if (!unmerged) {
    const positions = new Map<number, { left: number; right: number; top: number; bottom: number }>();
    map.map.forEach((offset, index) => {
      const col = index % map.width;
      const row = Math.floor(index / map.width);
      const rect = positions.get(offset);
      if (rect) { rect.right = Math.max(rect.right, col + 1); rect.bottom = row + 1; }
      else positions.set(offset, { left: col, right: col + 1, top: row, bottom: row + 1 });
    });
    node.forEach((row, offset, r) => row.forEach((_cell, cellOffset, c) => {
      const rect = positions.get(offset + 1 + cellOffset)!;
      cells.push({
        selector: `tr:nth-child(${r + 1}) > :nth-child(${c + 1})`,
        low: rowAxis ? rect.top : rect.left,
        high: rowAxis ? rect.bottom : rect.right,
      });
    }));
  }
  let firstTarget = 0;
  let lastTarget = lows.length - 1;
  for (const cell of cells) {
    if (cell.high - cell.low <= 1) continue;
    if (cell.low <= from && cell.high > from) return;
    if (cell.high <= from) firstTarget = Math.max(firstTarget, cell.high);
    else lastTarget = Math.min(lastTarget, cell.low - 1);
  }
  if (size <= 0) return;
  const id = `reorder-${crypto.randomUUID()}`;
  const prefix = `table[data-goose-reorder="${id}"]`;
  const style = table.ownerDocument.createElement("style");
  const transform = rowAxis ? "translateY" : "translateX";
  const source = cells.filter((cell) => cell.low === from);
  const selector = (items: typeof cells) => items.map((cell) => `${prefix} ${cell.selector}`).join(",");
  const rangeSelector = (low: number, high: number) => rowAxis
    ? `${prefix} tr:nth-child(n+${low + 1}):nth-child(-n+${high + 1}) > *`
    : `${prefix} tr > :nth-child(n+${low + 1}):nth-child(-n+${high + 1})`;
  const base = `${unmerged ? rangeSelector(from, from) : selector(source)} {position:relative;z-index:2;transform:${transform}(0px);box-shadow:inset 0 0 0 1px var(--goose-accent-drag-line);}`;
  const layer = unmerged ? tableReorderLayer(table, rowAxis, from) : undefined;
  let target = from;
  let active = false;
  const valid = () => !view.isDestroyed && table.isConnected &&
    view.state.doc.nodeAt(start - 1) === node;
  return {
    valid,
    paint(delta: number) {
      if (!active) {
        active = true;
        table.setAttribute("data-goose-reorder", id);
        if (!layer) table.ownerDocument.head.append(style);
        style.textContent = base + `${prefix} :not(*) {position:relative;} ${prefix} td:is(:not([data-background-color]),[data-background-color="default"]) {background-color:var(--bn-colors-editor-background);}`;
      }
      const rules = style.sheet?.cssRules;
      if (rules) (rules[0] as CSSStyleRule).style.transform = `${transform}(${delta / scale}px)`;
      grip.style.translate = rowAxis ? `0 ${delta}px` : `${delta}px 0`;
      const center = (lows[from] + highs[from]) / 2 + delta;
      let low = 0;
      let high = lows.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if ((lows[middle] + highs[middle]) / 2 < center) low = middle + 1;
        else high = middle;
      }
      const candidate = Math.max(0, Math.min(lows.length - 1,
        delta > 0 ? low - 1 : low));
      if (candidate === target || candidate < firstTarget || candidate > lastTarget ||
          highs[candidate] <= lows[candidate]) { layer?.paint(delta, target, size); return; }
      target = candidate;
      if (layer) { layer.paint(delta, target, size); return; }
      const lowShift = target > from ? from + 1 : target;
      const highShift = target > from ? target : from - 1;
      const shifted = unmerged ? rangeSelector(lowShift, highShift) : selector(cells.filter((cell) =>
        cell.low >= lowShift && cell.high <= highShift + 1,
      ));
      const neighbors = rules![1] as CSSStyleRule;
      neighbors.selectorText = target !== from && shifted ? shifted : `${prefix} :not(*)`;
      neighbors.style.transform = `${transform}(${(target > from ? -size : size) / scale}px)`;
    },
    finish(commit: boolean) {
      layer?.destroy();
      style.remove();
      table.removeAttribute("data-goose-reorder");
      grip.style.translate = "";
      if (!commit || target === from || !valid()) return;
      if (unmerged) {
        moveUnmergedTableDimension(view, node, start, rowAxis, from, target);
        return;
      }
      const state = view.state.apply(view.state.tr.setSelection(
        CellSelection.create(view.state.doc, start + map.map[0]),
      ));
      const move = rowAxis ? moveTableRow : moveTableColumn;
      move({ from, to: target, pos: start + 1 })(state, (tr) => {
        view.dispatch(closeHistory(tr).scrollIntoView());
        view.focus();
      });
    },
  };
}
