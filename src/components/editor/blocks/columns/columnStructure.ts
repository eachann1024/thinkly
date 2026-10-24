import type { Node as PMNode, Schema } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { COLUMN_LAYOUT, COLUMN_SECTION, columnWidthsProp, readColumnWidths } from "./columnModel";

function paragraph(schema: Schema) {
  return schema.nodes.blockContainer.create(null, schema.nodes.paragraph.create());
}

function section(children: PMNode[], schema: Schema, original?: PMNode): PMNode {
  const content = original?.firstChild ?? schema.nodes.columnSection.create();
  const group = original?.lastChild?.type.name === "blockGroup" ? original.lastChild : undefined;
  return schema.nodes.blockContainer.create(original?.attrs, [
    content, schema.nodes.blockGroup.create(group?.attrs, children.length ? children : [paragraph(schema)], group?.marks),
  ], original?.marks);
}

function repairLayout(node: PMNode, schema: Schema): PMNode {
  const sections: PMNode[] = [];
  const group = node.childCount > 1 ? node.lastChild : undefined;
  group?.forEach((child) => {
    if (child.firstChild?.type.name !== COLUMN_SECTION) {
      sections.push(section([child], schema));
      return;
    }
    const children: PMNode[] = [];
    if (child.childCount > 1) child.lastChild?.forEach((block) => children.push(block));
    sections.push(section(children, schema, child));
  });
  while (sections.length < 2) sections.push(section([], schema));
  const content = node.firstChild!;
  const widths = columnWidthsProp(readColumnWidths(content.attrs.widths, sections.length));
  return node.type.create(node.attrs, [
    content.type.create({ ...content.attrs, widths }, null, content.marks), schema.nodes.blockGroup.create(group?.attrs, sections, group?.marks),
  ], node.marks);
}

export function columnStructurePlugin() {
  return new Plugin({
    key: new PluginKey("goose-column-structure"),
    appendTransaction(transactions, _previous, state) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const repairs: { pos: number; node: PMNode; replacement: PMNode | PMNode[] }[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name !== "blockContainer") return true;
        const type = node.firstChild?.type.name;
        if (type === COLUMN_LAYOUT) {
          const replacement = repairLayout(node, state.schema);
          if (!node.eq(replacement)) { repairs.push({ pos, node, replacement }); return false; }
        }
        if (type === COLUMN_SECTION) {
          const $pos = state.doc.resolve(pos);
          const parent = $pos.depth > 1 ? $pos.node($pos.depth - 1) : undefined;
          if (parent?.firstChild?.type.name !== COLUMN_LAYOUT) {
            const children: PMNode[] = [];
            if (node.childCount > 1) node.lastChild?.forEach((child) => children.push(child));
            repairs.push({ pos, node, replacement: children.length ? children : [paragraph(state.schema)] });
            return false;
          }
        }
        return true;
      });
      if (!repairs.length) return null;
      const tr = state.tr;
      repairs.sort((left, right) => right.pos - left.pos).forEach(({ pos, node, replacement }) => {
        tr.replaceWith(pos, pos + node.nodeSize, replacement);
      });
      return tr;
    },
  });
}
