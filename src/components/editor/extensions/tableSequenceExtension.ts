import { createExtension } from "@blocknote/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";

const PLUGIN_KEY = new PluginKey("goose-table-sequence");

function cellHasSpan(cell: PMNode): boolean {
  return Number(cell.attrs.colspan ?? 1) > 1 || Number(cell.attrs.rowspan ?? 1) > 1;
}

function isSequenceText(text: string): boolean {
  const value = text.trim();
  return value === "" || /^\d+$/.test(value);
}

export function sequenceCellUpdates(
  table: PMNode,
  tablePos: number,
): { cellPos: number; text: string }[] {
  if (table.type.spec.tableRole !== "table" || table.childCount < 2) return [];
  for (let row = 0; row < table.childCount; row += 1) {
    const line = table.child(row);
    for (let col = 0; col < line.childCount; col += 1) {
      if (cellHasSpan(line.child(col))) return [];
    }
  }
  const updates: { cellPos: number; text: string }[] = [];
  let rowPos = tablePos + 1;
  let number = 1;
  for (let row = 0; row < table.childCount; row += 1) {
    const line = table.child(row);
    const cell = line.firstChild;
    const isHeader = cell?.type.spec.tableRole === "header_cell";
    if (!isHeader && cell && isSequenceText(cell.textContent)) {
      const text = String(number);
      number += 1;
      if (cell.textContent.trim() !== text) {
        updates.push({ cellPos: rowPos + 1, text });
      }
    }
    rowPos += line.nodeSize;
  }
  return updates;
}

function collectTables(doc: PMNode) {
  const tables: { node: PMNode; pos: number; id: string | null }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole !== "table") return;
    const parent = doc.resolve(pos).parent;
    const id = parent.type.name === "blockContainer" && parent.attrs.id
      ? String(parent.attrs.id)
      : null;
    tables.push({ node, pos, id });
    return false;
  });
  return tables;
}

function replaceSequenceCells(
  tr: Transaction,
  updates: { cellPos: number; text: string }[],
): Transaction | null {
  const paragraph = tr.doc.type.schema.nodes.tableParagraph;
  if (!paragraph || updates.length === 0) return tr.steps.length > 0 ? tr : null;
  const ordered = [...updates].sort((a, b) => b.cellPos - a.cellPos);
  for (const update of ordered) {
    const cell = tr.doc.nodeAt(update.cellPos);
    if (!cell) continue;
    const content = update.text ? tr.doc.type.schema.text(update.text) : null;
    tr.replaceWith(
      update.cellPos + 1,
      update.cellPos + cell.nodeSize - 1,
      paragraph.create(null, content),
    );
  }
  return tr.steps.length > 0 ? tr : null;
}

export function sequenceColumnTransaction(
  state: EditorState,
  oldState?: EditorState,
): Transaction | null {
  const tables = collectTables(state.doc);
  const previous = oldState ? collectTables(oldState.doc) : null;
  const updates: { cellPos: number; text: string }[] = [];
  tables.forEach((table, index) => {
    if (table.node.attrs.sequenceColumn !== true) return;
    if (previous) {
      const before = table.id
        ? previous.find((item) => item.id === table.id)
        : previous[index];
      if (!before || before.node.childCount === table.node.childCount) return;
    }
    updates.push(...sequenceCellUpdates(table.node, table.pos));
  });
  return replaceSequenceCells(state.tr, updates);
}

export function toggleTableSequenceTransaction(
  state: EditorState,
  blockId: string,
): Transaction | null {
  const table = collectTables(state.doc).find((item) => item.id === blockId);
  if (!table) return null;
  const enabled = table.node.attrs.sequenceColumn !== true;
  const tr = state.tr.setNodeMarkup(table.pos, undefined, {
    ...table.node.attrs,
    sequenceColumn: enabled,
  });
  tr.setMeta(PLUGIN_KEY, true);
  if (!enabled) return tr;
  const pos = tr.mapping.map(table.pos);
  const node = tr.doc.nodeAt(pos);
  if (!node) return tr;
  return replaceSequenceCells(tr, sequenceCellUpdates(node, pos)) ?? tr;
}

export function toggleTableSequence(editor: {
  prosemirrorState: EditorState;
  prosemirrorView: { dispatch: (tr: Transaction) => void };
  focus: () => void;
}, blockId: string) {
  const tr = toggleTableSequenceTransaction(editor.prosemirrorState, blockId);
  if (!tr) return;
  editor.prosemirrorView.dispatch(tr);
  editor.focus();
}

function tableSequencePlugin(usesRawContentRef: { current: boolean }) {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction(transactions, oldState, newState) {
      if (usesRawContentRef.current) return null;
      if (!transactions.some((tr) => tr.docChanged)) return null;
      if (transactions.some((tr) => tr.getMeta(PLUGIN_KEY))) return null;
      const next = sequenceColumnTransaction(newState, oldState);
      if (!next) return null;
      next.setMeta(PLUGIN_KEY, true);
      return next;
    },
  });
}

export function createGooseTableSequenceExtension(usesRawContentRef: {
  current: boolean;
}) {
  return createExtension({
    key: "goose-table-sequence",
    prosemirrorPlugins: [tableSequencePlugin(usesRawContentRef)],
  });
}
