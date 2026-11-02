import { createExtension } from "@blocknote/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { runTableWindowPaint } from "@/components/editor/core/programmaticRead";
import {
  initialRowWindow,
  rowWindowAround,
  tableUsesWindow,
  type RowWindow,
} from "./tableWindowModel";

import { sizedBlocksPlugin, tableSpans } from "./tableSizedDecorations";
import { observeWindowTables } from "./tableWindowViewport";

export const tableWindowKey = new PluginKey<Map<number, RowWindow>>("goose-table-window");
export const tableWindowMeta = "goose-table-window";

const ROW_HEIGHT = 44;

const mountedViews = new Set<EditorView>();

export function editorViewForTarget(target: EventTarget | null): EditorView | null {
  const editor = target instanceof Element ? target.closest(".bn-editor") : null;
  if (!editor) return null;
  for (const view of mountedViews) {
    if (view.dom === editor) return view;
  }
  return null;
}

export function readRowWindow(state: EditorState, tablePos: number, rowCount: number): RowWindow {
  return tableWindowKey.getState(state)?.get(tablePos) ?? initialRowWindow(rowCount);
}

function rowIndexAt(doc: Node, tablePos: number, pos: number): number | null {
  if (pos < tablePos) return null;
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.before(depth) === tablePos) return $pos.index(depth);
  }
  return null;
}

const visibleCache = new WeakMap<EditorState, Map<number, { start: number; end: number; pins: number[] } | null>>();

export function visibleRowIndexes(state: EditorState, table: Node, tablePos: number): { start: number; end: number; pins: number[] } | null {
  let byPos = visibleCache.get(state);
  if (!byPos) {
    byPos = new Map();
    visibleCache.set(state, byPos);
  }
  const cached = byPos.get(tablePos);
  if (cached !== undefined) return cached;
  const spans = tableSpans(table);
  if (!tableUsesWindow(table.childCount, spans)) {
    byPos.set(tablePos, null);
    return null;
  }
  const base = readRowWindow(state, tablePos, table.childCount);
  const pins: number[] = [];
  for (const pos of [state.selection.from, state.selection.to]) {
    const pin = rowIndexAt(state.doc, tablePos, pos);
    if (pin != null && !pins.includes(pin)) pins.push(pin);
  }
  const visible = { start: base.start, end: base.end, pins };
  byPos.set(tablePos, visible);
  return visible;
}
function pinsInTable(view: EditorView, tablePos: number): number[] {
  const pins: number[] = [];
  for (const pos of [view.state.selection.from, view.state.selection.to]) {
    const pin = rowIndexAt(view.state.doc, tablePos, pos);
    if (pin != null && !pins.includes(pin)) pins.push(pin);
  }
  return pins;
}

function syncWindows(view: EditorView, scroller: HTMLElement, tables: ReadonlyMap<HTMLElement, number>) {
  if (view.isDestroyed || !tables.size) return;
  const viewTop = scroller.getBoundingClientRect().top;
  let next: Map<number, RowWindow> | null = null;
  const current = tableWindowKey.getState(view.state) ?? new Map<number, RowWindow>();
  tables.forEach((tablePos, block) => {
    const tableNode = view.state.doc.nodeAt(tablePos);
    if (!tableNode || tableNode.type.spec.tableRole !== "table") return;
    if (!tableUsesWindow(tableNode.childCount, tableSpans(tableNode))) return;
    const scaleRaw = Number.parseFloat(getComputedStyle(block).getPropertyValue("--editor-scale"));
    const scale = Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : 1;
    const start = Math.floor((viewTop - block.getBoundingClientRect().top) / (ROW_HEIGHT * scale));
    const window = rowWindowAround(tableNode.childCount, Math.max(0, start), pinsInTable(view, tablePos));
    const prev = current.get(tablePos);
    const same = prev && prev.start === window.start && prev.end === window.end
      && prev.pins.length === window.pins.length && prev.pins.every((pin, index) => pin === window.pins[index]);
    if (same) return;
    next ??= new Map(current);
    next.set(tablePos, window);
  });
  if (!next) return;
  const painted = view.state.tr.setMeta(tableWindowMeta, next).setMeta("addToHistory", false);
  runTableWindowPaint(() => view.dispatch(painted));
}
const tableWindowPlugin = new Plugin<Map<number, RowWindow>>({
  key: tableWindowKey,
  state: {
    init: () => new Map(),
    apply(tr, value) {
      const meta = tr.getMeta(tableWindowMeta) as Map<number, RowWindow> | undefined;
      if (meta) return meta;
      if (!tr.docChanged || value.size === 0) return value;
      let moved = false;
      const mapped = new Map<number, RowWindow>();
      value.forEach((window, pos) => {
        const nextPos = tr.mapping.map(pos, -1);
        if (nextPos !== pos) moved = true;
        const node = tr.doc.nodeAt(nextPos);
        if (node?.type.spec.tableRole === "table") mapped.set(nextPos, window);
      });
      return moved || mapped.size !== value.size ? mapped : value;
    },
  },
  view(view) {
    mountedViews.add(view);
    const viewport = observeWindowTables(view, (scroller, tables) => syncWindows(view, scroller, tables));
    return {
      update: viewport.update,
      destroy() {
        mountedViews.delete(view);
        viewport.destroy();
      },
    };
  },
});

export const gooseTableWindowExtension = createExtension({
  key: "goose-table-window",
  prosemirrorPlugins: [sizedBlocksPlugin, tableWindowPlugin],
});
