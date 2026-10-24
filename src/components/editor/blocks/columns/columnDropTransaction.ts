import type { Node as PMNode } from "prosemirror-model";
import { TextSelection, type EditorState } from "prosemirror-state";
import { closeHistory } from "prosemirror-history";
import { COLUMN_LAYOUT, COLUMN_SECTION, columnWidthsProp, readColumnWidths } from "./columnModel";

export type ColumnDropSide = "left" | "right";
type Located = { node: PMNode; pos: number };

function locate(doc: PMNode, ids: Set<string>) {
  const found = new Map<string, Located>();
  doc.descendants((node, pos) => {
    if (node.type.name === "blockContainer" && ids.has(node.attrs.id)) found.set(node.attrs.id, { node, pos });
    return !node.type.spec.tableRole;
  });
  return found;
}

// Resolve once per document/target, never serialize blocks during dragover.
export function columnDropTransaction(
  state: EditorState, ids: string[], targetId: string, side: ColumnDropSide, protectedTitle?: string,
) {
  if (!ids.length || ids.includes(targetId) || targetId === protectedTitle || ids.includes(protectedTitle ?? "")) return null;
  const found = locate(state.doc, new Set([...ids, targetId]));
  const target = found.get(targetId);
  const sources = ids.map((id) => found.get(id));
  if (!target || sources.some((source) => !source)) return null;
  const ordered = (sources as Located[]).sort((a, b) => a.pos - b.pos);
  const targetType = target.node.firstChild?.type.name;
  if (targetType === COLUMN_LAYOUT) return null;
  for (let index = 0; index < ordered.length; index++) {
    const source = ordered[index];
    if (source.node.firstChild?.type.name === COLUMN_SECTION) return null;
    if (index && source.pos < ordered[index - 1].pos + ordered[index - 1].node.nodeSize) return null;
    if (target.pos >= source.pos && target.pos < source.pos + source.node.nodeSize) return null;
    if (source.pos > target.pos && source.pos < target.pos + target.node.nodeSize) {
      if (targetType !== COLUMN_SECTION) return null;
      const parent = state.doc.resolve(source.pos).node(-1);
      if (parent !== target.node || ordered.length >= (target.node.lastChild?.childCount ?? 0)) return null;
    }
  }
  const { schema } = state;
  const wrap = (type: string, children: PMNode[], attrs = {}) => schema.nodes.blockContainer.create(
    { id: crypto.randomUUID() }, [schema.nodes[type].create(attrs), schema.nodes.blockGroup.create(null, children)],
  );
  const tr = closeHistory(state.tr);
  for (const source of [...ordered].reverse()) tr.delete(source.pos, source.pos + source.node.nodeSize);
  const pos = tr.mapping.map(target.pos);
  const remaining = tr.doc.nodeAt(pos);
  if (!remaining || remaining.attrs.id !== targetId) return null;
  const moved = wrap(COLUMN_SECTION, ordered.map(({ node }) => node));
  if (targetType === COLUMN_SECTION) {
    const $target = tr.doc.resolve(pos);
    const layout = $target.node(-1);
    if (layout.firstChild?.type.name !== COLUMN_LAYOUT) return null;
    const layoutPos = $target.before($target.depth - 1);
    const count = layout.lastChild!.childCount;
    const widths = readColumnWidths(layout.firstChild.attrs.widths, count).map((width) => width * count / (count + 1));
    widths.splice($target.index() + (side === "right" ? 1 : 0), 0, 100 / (count + 1));
    tr.insert(pos + (side === "right" ? remaining.nodeSize : 0), moved);
    tr.setNodeMarkup(layoutPos + 1, undefined, { ...layout.firstChild.attrs, widths: columnWidthsProp(widths) });
  } else {
    const stationary = wrap(COLUMN_SECTION, [remaining]);
    tr.replaceWith(pos, pos + remaining.nodeSize, wrap(COLUMN_LAYOUT,
      side === "right" ? [stationary, moved] : [moved, stationary], { widths: "50,50" }));
  }
  const first = locate(tr.doc, new Set([ordered[0].node.attrs.id])).get(ordered[0].node.attrs.id);
  if (first) tr.setSelection(TextSelection.near(tr.doc.resolve(first.pos + 2)));
  return tr.scrollIntoView();
}
