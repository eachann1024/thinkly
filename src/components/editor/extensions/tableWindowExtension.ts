import { createExtension } from "@blocknote/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { runTableWindowPaint } from "@/components/editor/core/programmaticRead";
import {
  initialRowWindow,
  rowWindowAround,
  tableUsesWindow,
  type RowWindow,
} from "./tableWindowModel";

export const tableWindowKey = new PluginKey<Map<number, RowWindow>>("goose-table-window");
export const tableWindowMeta = "goose-table-window";

const spanCache = new WeakMap<Node, boolean>();
const ROW_HEIGHT = 44;

function tableSpans(table: Node): boolean {
  const cached = spanCache.get(table);
  if (cached != null) return cached;
  let spans = false;
  table.forEach((row) => {
    if (spans) return;
    row.forEach((cell) => {
      if ((cell.attrs.colspan ?? 1) > 1 || (cell.attrs.rowspan ?? 1) > 1) spans = true;
    });
  });
  spanCache.set(table, spans);
  return spans;
}

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
  const pins = base.pins.slice();
  for (const pos of [state.selection.from, state.selection.to]) {
    const pin = rowIndexAt(state.doc, tablePos, pos);
    if (pin != null && !pins.includes(pin)) pins.push(pin);
  }
  const visible = { start: base.start, end: base.end, pins };
  byPos.set(tablePos, visible);
  return visible;
}
const sizedBlocks = new WeakMap<Node, DecorationSet>();

function sizedBlockDecorations(doc: Node): DecorationSet {
  const cached = sizedBlocks.get(doc);
  if (cached) return cached;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.spec.tableRole) {
      if (node.type.spec.tableRole === "table" && tableUsesWindow(node.childCount, tableSpans(node))) {
        const block = doc.nodeAt(pos - 1);
        if (block?.type.name === "blockContainer") {
          decorations.push(Decoration.node(pos - 1, pos - 1 + block.nodeSize, {
            class: "goose-sized-block",
            style: `--goose-intrinsic-rows:${node.childCount};--goose-intrinsic-row:44px`,
          }));
        }
      }
      return false;
    }
    if (node.type.name === "codeBlock" && node.textContent.length > 2000) {
      const lines = node.textContent.split("\n").length;
      const block = doc.nodeAt(pos - 1);
      if (block?.type.name === "blockContainer") {
        decorations.push(Decoration.node(pos - 1, pos - 1 + block.nodeSize, {
          class: "goose-sized-block",
          style: `--goose-intrinsic-rows:${lines};--goose-intrinsic-row:22px`,
        }));
      }
      return false;
    }
  });
  const set = DecorationSet.create(doc, decorations);
  sizedBlocks.set(doc, set);
  return set;
}

function pinsInTable(view: EditorView, tablePos: number): number[] {
  const pins: number[] = [];
  for (const pos of [view.state.selection.from, view.state.selection.to]) {
    const pin = rowIndexAt(view.state.doc, tablePos, pos);
    if (pin != null && !pins.includes(pin)) pins.push(pin);
  }
  return pins;
}

function scrollParent(node: HTMLElement): HTMLElement {
  let el: HTMLElement | null = node.parentElement;
  while (el && el !== document.body) {
    const overflow = getComputedStyle(el).overflowY;
    if (overflow === "auto" || overflow === "scroll") return el;
    el = el.parentElement;
  }
  return document.scrollingElement as HTMLElement ?? document.documentElement;
}

function syncWindows(view: EditorView) {
  if (view.isDestroyed) return;
  const tables = view.dom.querySelectorAll<HTMLElement>('[data-content-type="table"]');
  let next: Map<number, RowWindow> | null = null;
  const current = tableWindowKey.getState(view.state) ?? new Map<number, RowWindow>();
  tables.forEach((block) => {
    const desc = (block as HTMLElement & { pmViewDesc?: { posBefore: number; node: Node } }).pmViewDesc;
    const tableNode = desc?.node;
    const tablePos = desc ? desc.posBefore : null;
    if (!tableNode || tablePos == null || tableNode.type.spec.tableRole !== "table") return;
    if (!tableUsesWindow(tableNode.childCount, tableSpans(tableNode))) return;
    const scaleRaw = Number.parseFloat(getComputedStyle(block).getPropertyValue("--editor-scale"));
    const scale = Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : 1;
    const viewTop = scrollParent(block).getBoundingClientRect().top;
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
  props: {
    decorations: (state) => sizedBlockDecorations(state.doc),
  },
  view(view) {
    mountedViews.add(view);
    let frame = 0;
    let scroller: HTMLElement | null = null;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const nextScroller = scrollParent(view.dom);
        if (nextScroller !== scroller) {
          scroller?.removeEventListener("scroll", schedule);
          scroller = nextScroller;
          scroller.addEventListener("scroll", schedule, { passive: true });
        }
        syncWindows(view);
      });
    };
    window.addEventListener("resize", schedule);
    schedule();
    return {
      update: schedule,
      destroy() {
        mountedViews.delete(view);
        if (frame) cancelAnimationFrame(frame);
        scroller?.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      },
    };
  },
});

export const gooseTableWindowExtension = createExtension({
  key: "goose-table-window",
  prosemirrorPlugins: [tableWindowPlugin],
});
