(() => {
  const D = window.TableDesign;
  const S = D.state;
  const cellAt = (r, c) => D.table.querySelector(`[data-row="${r}"][data-col="${c}"]`);
  D.bounds = () => S.anchor && S.head ? {
    top: Math.min(S.anchor[0], S.head[0]), bottom: Math.max(S.anchor[0], S.head[0]),
    left: Math.min(S.anchor[1], S.head[1]), right: Math.max(S.anchor[1], S.head[1]),
  } : null;
  D.cells = () => [...D.table.querySelectorAll("td.is-selected")];
  D.updateGeometry = () => {
    const bounds = D.bounds();
    const base = D.wrap.getBoundingClientRect();
    const border = D.wrap.querySelector(".range-border");
    border.hidden = !bounds;
    if (bounds) {
      const a = cellAt(bounds.top, bounds.left).getBoundingClientRect();
      const b = cellAt(bounds.bottom, bounds.right).getBoundingClientRect();
      Object.assign(border.style, { left: `${a.left - base.left}px`, top: `${a.top - base.top}px`, width: `${b.right - a.left}px`, height: `${b.bottom - a.top}px` });
    }
    D.wrap.querySelectorAll(".row-handle").forEach((button, index) => {
      const rect = cellAt(index, 0).getBoundingClientRect();
      button.style.top = `${rect.top - base.top}px`;
      button.style.height = `${rect.height}px`;
    });
  };
  D.update = () => {
    const b = D.bounds();
    D.table.querySelectorAll("td").forEach((cell) => {
      const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
      const selected = Boolean(b && r >= b.top && r <= b.bottom && c >= b.left && c <= b.right);
      const active = Boolean(S.anchor && r === S.anchor[0] && c === S.anchor[1]);
      cell.classList.toggle("is-selected", selected);
      cell.classList.toggle("active-cell", active);
      cell.setAttribute("aria-selected", String(selected));
      cell.tabIndex = active || (!b && r === 0 && c === 0) ? 0 : -1;
      cell.dataset.custom = String(S.custom && r === 0 && c === 3);
    });
    D.table.querySelectorAll("thead th").forEach((th, index) => th.classList.toggle("selected-column", Boolean(b && index >= b.left && index <= b.right)));
    D.wrap.querySelectorAll(".row-handle").forEach((button, index) => button.setAttribute("aria-pressed", String(Boolean(b && index >= b.top && index <= b.bottom))));
    D.wrap.classList.toggle("inactive", S.inactive);
    document.querySelector(".selection-label").textContent = b ? `${b.bottom - b.top + 1} 行 × ${b.right - b.left + 1} 列` : "未选择";
    document.querySelector(".toolbar-slot").dataset.empty = String(!b);
    document.querySelectorAll("[data-action]").forEach((button) => { button.disabled = !b; });
    document.querySelector("#focus-toggle").setAttribute("aria-pressed", String(S.inactive));
    document.querySelector("#focus-toggle").textContent = S.inactive ? "恢复聚焦" : "预览失焦";
    document.querySelector("#custom-background").setAttribute("aria-pressed", String(S.custom));
    document.querySelectorAll("[data-preset]").forEach((button) => {
      const mode = !b ? "none" : b.left === 0 && b.right === 3 ? "rows" :
        b.top === b.bottom && b.left === b.right ? "single" :
          b.top === 0 && b.bottom === D.rows.length - 1 && b.left === b.right ? "column" : "range";
      button.setAttribute("aria-pressed", String(button.dataset.preset === mode));
    });
    D.syncFormat?.();
    D.updateGeometry();
  };
  D.select = (anchor, head = anchor, focus = false) => {
    S.anchor = anchor ? [...anchor] : null;
    S.head = head ? [...head] : null;
    S.inactive = false;
    D.update();
    if (focus && S.anchor) cellAt(...S.anchor).focus({ preventScroll: true });
  };
  let dragging = false;
  const coords = (cell) => [Number(cell.dataset.row), Number(cell.dataset.col)];
  D.table.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest("td");
    if (!cell || event.button !== 0) return;
    if (event.pointerType !== "touch") event.preventDefault();
    D.select(event.shiftKey && S.anchor ? S.anchor : coords(cell), coords(cell), true);
    dragging = event.pointerType !== "touch";
    D.wrap.classList.toggle("dragging", dragging);
  });
  document.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest(".data-table td");
    if (!cell) return;
    const next = coords(cell);
    if (next[0] === S.head[0] && next[1] === S.head[1]) return;
    S.head = next; D.update();
  });
  const stopDrag = () => { dragging = false; D.wrap.classList.remove("dragging"); };
  document.addEventListener("pointerup", stopDrag);
  document.addEventListener("pointercancel", stopDrag);
  D.table.addEventListener("keydown", (event) => {
    if (!event.target.matches("td")) return;
    const current = S.head || coords(event.target);
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dr, dc] = moves[event.key];
      const next = [Math.max(0, Math.min(D.rows.length - 1, current[0] + dr)), Math.max(0, Math.min(3, current[1] + dc))];
      D.select(event.shiftKey && S.anchor ? S.anchor : next, next);
      cellAt(...next).focus({ preventScroll: true });
      cellAt(...next).scrollIntoView({ block: "nearest", inline: "nearest" });
    } else if (event.key === "Escape") { event.preventDefault(); D.select(null); }
    else if (event.key === "Enter") { event.preventDefault(); D.editCell(event.target); }
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault(); D.select([0, 0], [D.rows.length - 1, 3]);
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      event.preventDefault(); D.copy();
    }
  });
  D.table.addEventListener("dblclick", (event) => {
    const cell = event.target.closest("td"); if (cell) D.editCell(cell);
  });
  D.wrap.addEventListener("click", (event) => {
    const row = event.target.closest("[data-select-row]");
    const column = event.target.closest("[data-column]");
    if (row) D.select([Number(row.dataset.selectRow), 0], [Number(row.dataset.selectRow), 3]);
    if (column) D.select([0, Number(column.dataset.column)], [D.rows.length - 1, Number(column.dataset.column)]);
  });
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    const presets = { single: [[0, 0], [0, 0]], range: [[0, 1], [2, 2]], rows: [[0, 0], [1, 3]], column: [[0, 1], [D.rows.length - 1, 1]], none: [null, null] };
    D.select(...presets[button.dataset.preset]);
  }));
  document.querySelector("#focus-toggle").addEventListener("click", () => { S.inactive = !S.inactive; D.update(); });
  document.querySelector("#custom-background").addEventListener("click", () => { S.custom = !S.custom; D.update(); });
  document.querySelector("#append-row").addEventListener("click", () => {
    const row = document.createElement("tr"); row.setAttribute("role", "row");
    const index = D.rows.length;
    D.rows.push(["新条目", "—", "—", "—"]);
    row.innerHTML = D.rows[index].map((value, col) => `<td role="gridcell" data-row="${index}" data-col="${col}" tabindex="-1" aria-selected="false"><span class="cell-content">${value}</span></td>`).join("");
    D.table.querySelector("tbody").append(row);
    D.wrap.querySelector(".row-gutter").insertAdjacentHTML("beforeend", `<button class="row-handle" data-select-row="${index}" aria-label="选择第 ${index + 1} 行" aria-pressed="false">${D.icon("DotsSixVertical")}</button>`);
    D.select([index, 0]); cellAt(index, 0).scrollIntoView({ block: "nearest" });
  });
  window.addEventListener("blur", () => { stopDrag(); S.inactive = true; D.update(); });
  window.addEventListener("focus", () => { S.inactive = false; D.update(); });
  new ResizeObserver(() => D.updateGeometry()).observe(D.table);
  D.update();
})();
