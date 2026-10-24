/** A viewport copy keeps pointer frames away from the document and offscreen cells. */
export function tableReorderLayer(table: HTMLTableElement, rowAxis: boolean, from: number) {
  const doc = table.ownerDocument;
  const win = doc.defaultView!;
  const bounds = table.getBoundingClientRect();
  const sourceRect = rowAxis ? table.rows[from].getBoundingClientRect() : bounds;
  const overscan = rowAxis ? sourceRect.height : 44;
  const visible = Array.from(table.rows, (row, index) => ({ row, index, rect: row.getBoundingClientRect() }))
    .filter(({ rect }) => rect.bottom >= -overscan && rect.top <= win.innerHeight + overscan);
  if (!visible.length) return;
  const root = doc.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.inert = true;
  root.dataset.gooseTableDragLayer = "";
  Object.assign(root.style, {
    position: "fixed", left: `${bounds.left}px`, top: `${visible[0].rect.top - (table.rows[0].getBoundingClientRect().top - bounds.top)}px`,
    width: `${bounds.width}px`, pointerEvents: "none", zIndex: "9999",
  });
  // Retain theme, editor scale and descendant selectors without copying layout boxes.
  const contextRoot = table.closest("[data-page-layout]") ?? table.closest(".workspace-editor-surface");
  const ancestors: HTMLElement[] = [];
  for (let parent = table.parentElement; parent; parent = parent.parentElement) {
    ancestors.unshift(parent);
    if (parent === contextRoot) break;
  }
  let parent: HTMLElement = root;
  for (const ancestor of ancestors) {
    const context = ancestor.cloneNode(false) as HTMLElement;
    context.removeAttribute("id");
    context.removeAttribute("data-id");
    context.removeAttribute("contenteditable");
    context.style.display = "contents";
    parent.append(context);
    parent = context;
  }
  const copy = table.cloneNode(false) as HTMLTableElement;
  copy.removeAttribute("data-goose-reorder");
  copy.style.setProperty("width", `${bounds.width}px`, "important");
  copy.style.setProperty("min-width", "0", "important");
  copy.style.setProperty("margin", "0", "important");
  copy.style.height = "auto";
  copy.style.visibility = "visible";
  const colgroup = table.querySelector("colgroup")?.cloneNode(true) as HTMLElement | undefined;
  if (colgroup) {
    const originalCols = table.querySelectorAll("col");
    colgroup.querySelectorAll("col").forEach((col, i) => {
      col.style.width = `${originalCols[i].getBoundingClientRect().width}px`;
    });
    copy.append(colgroup);
  }
  const body = doc.createElement("tbody");
  const rows = visible.map(({ row, rect, index }) => {
    const clone = row.cloneNode(true) as HTMLTableRowElement;
    clone.style.height = `${rect.height}px`;
    clone.querySelectorAll("[id], [data-id], [contenteditable]").forEach((el) => {
      el.removeAttribute("id"); el.removeAttribute("data-id"); el.removeAttribute("contenteditable");
    });
    const sourceCells = rowAxis ? (index === from ? Array.from(clone.cells) : []) : [clone.cells[from]];
    for (const cell of sourceCells) {
      const original = row.cells[cell.cellIndex];
      const background = win.getComputedStyle(original).backgroundColor;
      cell.style.backgroundColor = background === "rgba(0, 0, 0, 0)"
        ? "var(--bn-colors-editor-background)" : background;
      cell.style.boxShadow = "inset 0 0 0 1px var(--goose-accent-drag-line)";
      cell.style.position = "relative";
      cell.style.zIndex = "2";
      cell.style.willChange = "transform";
    }
    body.append(clone);
    return { clone, index };
  });
  copy.append(body);
  parent.append(copy);
  const originalVisibility = table.style.visibility;
  const source = rowAxis ? rows.filter((row) => row.index === from).map(({ clone }) => clone)
    : rows.map(({ clone }) => clone.cells[from]);
  let lastTarget = from;
  let active = false;
  return {
    paint(delta: number, target: number, size: number) {
      if (!active) {
        active = true;
        doc.body.append(root);
        table.style.visibility = "hidden";
      }
      const translate = rowAxis ? `translateY(${delta}px)` : `translateX(${delta}px)`;
      for (const el of source) el.style.transform = translate;
      if (target === lastTarget) return;
      lastTarget = target;
      for (const { clone, index } of rows) {
        const tracks = rowAxis ? [clone] : Array.from(clone.cells);
        tracks.forEach((el, col) => {
          const track = rowAxis ? index : col;
          if (track === from) return;
          const shift = target > from ? track > from && track <= target : track >= target && track < from;
          const distance = shift ? (target > from ? -size : size) : 0;
          el.style.transform = rowAxis ? `translateY(${distance}px)` : `translateX(${distance}px)`;
          el.style.position = "relative";
        });
      }
    },
    destroy() {
      root.remove();
      if (active) table.style.visibility = originalVisibility;
    },
  };
}
