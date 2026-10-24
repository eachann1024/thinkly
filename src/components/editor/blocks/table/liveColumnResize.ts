import { Plugin } from "prosemirror-state";
import { columnResizingPluginKey, TableMap } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";

/** Keep the native hover handles, but preview DOM widths without editor transactions. */
export function withLiveColumnResize(plugin: Plugin): Plugin {
  if (plugin.spec.key !== columnResizingPluginKey) return plugin;
  return new Plugin({
    ...plugin.spec,
    props: {
      ...plugin.props,
      handleDOMEvents: {
        ...plugin.props.handleDOMEvents,
        mousedown: startResize,
      },
    },
  });
}

function startResize(view: EditorView, event: MouseEvent): boolean {
  const state = columnResizingPluginKey.getState(view.state);
  if (!view.editable || event.button !== 0 || !state || state.activeHandle < 0 || state.dragging) return false;
  const $cell = view.state.doc.resolve(state.activeHandle);
  const node = $cell.node(-1);
  const start = $cell.start(-1);
  const tablePos = start - 1;
  const map = TableMap.get(node);
  const colIndex = map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs.colspan - 1;
  const cellDom = view.nodeDOM(state.activeHandle) as HTMLElement | null;
  const table = cellDom?.closest("table");
  const cols = table?.querySelectorAll("col");
  const win = view.dom.ownerDocument.defaultView;
  if (!table || !cols || cols.length !== map.width || !win) return false;

  // Read geometry once, including auto-sized columns and editor zoom.
  const scale = table.getBoundingClientRect().width / table.offsetWidth || 1;
  const widths = Array.from(cols, (col) => col.getBoundingClientRect().width / scale);
  const originalWidth = widths[colIndex];
  const baseTotal = widths.reduce((sum, width) => sum + width, 0) - originalWidth;
  const savedStyle = table.getAttribute("style");
  const savedCols = Array.from(cols, (col) => col.getAttribute("style"));
  let width = originalWidth;
  let closed = false;
  const startX = event.clientX;
  const abort = new AbortController();
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, {
    setDragging: { startX, startWidth: originalWidth },
  }));
  for (let i = 0; i < cols.length; i++) cols[i].style.width = `${widths[i]}px`;
  // BlockNote's width:auto!important otherwise overrides TableView's inline width.
  table.style.setProperty("width", `${baseTotal + width}px`, "important");
  table.style.minWidth = "";

  const paint = (x: number) => {
    const next = Math.max(35, Math.round(originalWidth + (x - startX) / scale));
    if (next === width) return;
    width = next;
    cols[colIndex].style.width = `${width}px`;
    table.style.setProperty("width", `${baseTotal + width}px`, "important");
  };
  const restore = () => {
    if (savedStyle === null) table.removeAttribute("style");
    else table.setAttribute("style", savedStyle);
    cols.forEach((col, i) => {
      const style = savedCols[i];
      if (style === null) col.removeAttribute("style");
      else col.setAttribute("style", style);
    });
  };
  const finish = (commit: boolean) => {
    if (closed) return;
    closed = true;
    abort.abort();
    observer.disconnect();
    if (view.isDestroyed) return;
    const current = view.state.doc.nodeAt(tablePos);
    restore();
    const tr = view.state.tr.setMeta(columnResizingPluginKey, { setHandle: -1 });
    // A concurrent edit/deletion invalidates the captured positions; never overwrite it.
    if (commit && width !== originalWidth && current === node) {
      widths[colIndex] = width;
      const seen = new Set<number>();
      map.map.forEach((pos) => {
        if (seen.has(pos)) return;
        seen.add(pos);
        const cell = node.nodeAt(pos)!;
        const first = map.colCount(pos);
        tr.setNodeMarkup(start + pos, null, {
          ...cell.attrs,
          colwidth: widths.slice(first, first + cell.attrs.colspan).map(Math.round),
        });
      });
    }
    view.dispatch(tr);
  };
  const observer = new MutationObserver(() => {
    if (!view.dom.isConnected || !table.isConnected || view.state.doc.nodeAt(tablePos) !== node) finish(false);
  });
  observer.observe(view.dom.ownerDocument, { childList: true, subtree: true });
  win.addEventListener("mousemove", (move) => {
    if (!(move.buttons & 1)) return finish(true);
    if (view.isDestroyed || view.state.doc.nodeAt(tablePos) !== node) return finish(false);
    paint(move.clientX);
    move.preventDefault();
  }, { signal: abort.signal });
  win.addEventListener("mouseup", (up) => { paint(up.clientX); finish(true); }, { signal: abort.signal });
  win.addEventListener("blur", () => finish(true), { signal: abort.signal });
  win.addEventListener("keydown", (key) => {
    if (key.key !== "Escape") return;
    key.preventDefault();
    finish(false);
  }, { capture: true, signal: abort.signal });
  event.preventDefault();
  return true;
}
