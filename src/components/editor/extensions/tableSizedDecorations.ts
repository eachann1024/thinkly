import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { tableUsesWindow } from "./tableWindowModel";

const spanCache = new WeakMap<Node, boolean>();
const lineCache = new WeakMap<Node, number>();
export const sizedBlocksKey = new PluginKey<DecorationSet>("goose-sized-blocks");

export function tableSpans(table: Node): boolean {
  const cached = spanCache.get(table);
  if (cached != null) return cached;
  let spans = false;
  table.forEach(row => row.forEach(cell => {
    if ((cell.attrs.colspan ?? 1) > 1 || (cell.attrs.rowspan ?? 1) > 1) spans = true;
  }));
  spanCache.set(table, spans);
  return spans;
}

function scan(doc: Node, from: number, to: number): Decoration[] {
  const decorations: Decoration[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    const table = node.type.spec.tableRole === "table";
    let rows = 0;
    if (table && tableUsesWindow(node.childCount, tableSpans(node))) rows = node.childCount;
    if (node.type.name === "codeBlock" && node.textContent.length > 2000) {
      rows = lineCache.get(node) ?? node.textContent.split("\n").length;
      lineCache.set(node, rows);
    }
    if (rows && pos > 0) {
      const block = doc.nodeAt(pos - 1);
      if (block?.type.name === "blockContainer") {
        decorations.push(Decoration.node(pos - 1, pos - 1 + block.nodeSize, {
          class: "goose-sized-block",
          style: `--goose-intrinsic-rows:${rows};--goose-intrinsic-row:${table ? 44 : 22}px`,
        }, { table }));
      }
    }
    if (node.type.spec.tableRole || node.type.name === "codeBlock") return false;
  });
  return decorations;
}

type Range = { from: number; to: number };

function changedBlocks(tr: Transaction): Range[] {
  const ranges: Range[] = [];
  let needsDiff = false;
  tr.mapping.maps.forEach((map, index) => {
    let changed = false;
    map.forEach((_a, _b, from, to) => {
      changed = true;
      const rest = tr.mapping.slice(index + 1);
      ranges.push({ from: rest.map(from, -1), to: rest.map(to, 1) });
    });
    // Attribute steps can change span eligibility without moving positions.
    if (!changed) needsDiff = true;
  });
  if (needsDiff || !ranges.length) {
    const from = tr.before.content.findDiffStart(tr.doc.content);
    const end = tr.before.content.findDiffEnd(tr.doc.content);
    if (from != null) ranges.push({ from, to: Math.max(from, end?.b ?? from) });
  }
  const expanded = ranges.map(({ from, to }) => {
    const $from = tr.doc.resolve(Math.max(0, Math.min(from, tr.doc.content.size)));
    const $to = tr.doc.resolve(Math.max($from.pos, Math.min(to, tr.doc.content.size)));
    let start = $from.pos;
    let end = $to.pos;
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === "blockContainer") { start = $from.before(depth); break; }
    }
    for (let depth = $to.depth; depth > 0; depth--) {
      if ($to.node(depth).type.name === "blockContainer") { end = $to.after(depth); break; }
    }
    return { from: start, to: end };
  }).sort((a, b) => a.from - b.from);
  const merged: Range[] = [];
  for (const range of expanded) {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to) previous.to = Math.max(previous.to, range.to);
    else merged.push(range);
  }
  return merged;
}

export const sizedBlocksPlugin = new Plugin<DecorationSet>({
  key: sizedBlocksKey,
  state: {
    init: (_, state) => DecorationSet.create(state.doc, scan(state.doc, 0, state.doc.content.size)),
    apply(tr, previous) {
      if (!tr.docChanged) return previous;
      let next = previous.map(tr.mapping, tr.doc);
      for (const { from, to } of changedBlocks(tr)) {
        next = next.remove(next.find(from, to).filter(decoration => decoration.from < to && decoration.to > from));
        next = next.add(tr.doc, scan(tr.doc, from, to));
      }
      return next;
    },
  },
  props: { decorations: state => sizedBlocksKey.getState(state) },
});
