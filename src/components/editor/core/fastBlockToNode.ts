import { blockToNode, type PartialBlock } from "@blocknote/core";
import type { Node, Schema } from "@tiptap/pm/model";

const pendingOpen = new WeakMap<object, unknown>();

export function noteFastOpen(editor: object, content: unknown) {
  pendingOpen.set(editor, content);
}

export function takeFastOpen(editor: object): unknown {
  const content = pendingOpen.get(editor);
  if (content !== undefined) pendingOpen.delete(editor);
  return content;
}

export function sourceLooksHeavy(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  if (content.length > 80) return true;
  for (const block of content) {
    const body = (block as { content?: unknown }).content;
    const rows = (body as { rows?: unknown[] } | null)?.rows;
    if (Array.isArray(rows) && rows.length >= 64) return true;
    if (typeof body === "string" && body.length > 20000) return true;
  }
  return false;
}

function plainCell(cell: unknown): { text: string; props: Record<string, unknown> } | null {
  if (typeof cell === "string") return { text: cell, props: {} };
  if (!cell || typeof cell !== "object") return null;
  const record = cell as { type?: string; content?: unknown; props?: Record<string, unknown> };
  if (record.type !== "tableCell") return null;
  if (Number(record.props?.colspan ?? 1) > 1 || Number(record.props?.rowspan ?? 1) > 1) return null;
  if (typeof record.content === "string" || record.content == null) {
    return { text: typeof record.content === "string" ? record.content : "", props: record.props ?? {} };
  }
  return null;
}

function simpleTable(block: PartialBlock): { rows: { cells: unknown[] }[]; headerRows: number; headerCols: number; widths: unknown[] } | null {
  const content = block.content as {
    type?: string;
    rows?: { cells?: unknown[] }[];
    headerRows?: number;
    headerCols?: number;
    columnWidths?: unknown[];
  } | undefined;
  if (!content || content.type !== "tableContent" || !Array.isArray(content.rows) || content.rows.length === 0) return null;
  for (const row of content.rows) {
    if (!Array.isArray(row?.cells) || row.cells.some((cell) => !plainCell(cell))) return null;
  }
  return {
    rows: content.rows as { cells: unknown[] }[],
    headerRows: Number(content.headerRows) || 0,
    headerCols: Number(content.headerCols) || 0,
    widths: Array.isArray(content.columnWidths) ? content.columnWidths : [],
  };
}

function hasSimpleTable(block: PartialBlock): boolean {
  if (simpleTable(block)) return true;
  return (block.children ?? []).some((child) => hasSimpleTable(child));
}

function tableNode(block: PartialBlock, schema: Schema, spec: NonNullable<ReturnType<typeof simpleTable>>): Node {
  const rows = spec.rows.map((row, rowIndex) => schema.nodes.tableRow.create(null, row.cells.map((cell, cellIndex) => {
    const plain = plainCell(cell)!;
    const paragraph = schema.nodes.tableParagraph.create(null, plain.text ? schema.text(plain.text) : null);
    const width = spec.widths[cellIndex];
    const name = rowIndex < spec.headerRows || cellIndex < spec.headerCols ? "tableHeader" : "tableCell";
    return schema.nodes[name].create({
      textColor: plain.props.textColor || "default",
      backgroundColor: plain.props.backgroundColor || "default",
      textAlignment: plain.props.textAlignment || "left",
      colspan: 1,
      rowspan: 1,
      colwidth: width ? [width] : null,
    }, paragraph);
  })));
  const textColor = (block.props as { textColor?: string } | undefined)?.textColor || "default";
  const table = schema.nodes.table.create({ textColor }, rows);
  const children = (block.children ?? []).map((child) => blockToEditorNode(child, schema));
  const group = children.length ? schema.nodes.blockGroup.create(null, children) : null;
  return schema.nodes.blockContainer.create(
    { id: block.id || crypto.randomUUID() },
    group ? [table, group] : table,
  );
}

/** 无合并单元格的大表不走 BlockNote 的占位网格。那是按格子重复建网格，上千行要数秒。 */
export function blockToEditorNode(block: PartialBlock, schema: Schema): Node {
  const spec = simpleTable(block);
  if (spec) return tableNode(block, schema, spec);
  if (!hasSimpleTable(block)) return blockToNode(block, schema);
  const shell = blockToNode({ ...block, children: undefined }, schema);
  const children = (block.children ?? []).map((child) => blockToEditorNode(child, schema));
  if (!children.length || !shell.firstChild) return shell;
  return schema.nodes.blockContainer.create(shell.attrs, [
    shell.firstChild,
    schema.nodes.blockGroup.create(null, children),
  ]);
}
