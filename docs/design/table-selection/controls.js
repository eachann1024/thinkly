(() => {
  const D = window.TableDesign;
  const S = D.state;
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  const hexRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  D.applyTheme = () => {
    const dark = S.mode === "dark" || (S.mode === "auto" && media.matches);
    root.dataset.theme = dark ? "dark" : "light";
    const accent = D.accents[S.accent];
    const themeColor = dark ? accent.dark : accent.light;
    const edge = dark ? S.policy === "universal" ? "#8caedc" : accent.dark : accent.light;
    root.style.setProperty("--theme-color", themeColor);
    root.style.setProperty("--theme-subtle", `rgba(${hexRgb(themeColor)}, .10)`);
    root.style.setProperty("--selection-edge", edge);
    root.style.setProperty("--selection-text", edge);
    root.style.setProperty("--selection-rgb", hexRgb(edge).join(", "));
    document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === S.mode)));
    document.querySelectorAll("[data-accent]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.accent === S.accent)));
    document.querySelector("#dark-policy").disabled = !dark;
    document.querySelector(".dark-policy").dataset.disabled = String(!dark);
    document.querySelector("#dark-policy").value = S.policy;
    const query = new URLSearchParams({ mode: S.mode, accent: S.accent, policy: S.policy });
    document.querySelectorAll(".versions a").forEach((link) => { link.search = query.toString(); });
  };
  const query = new URLSearchParams(location.search);
  if (["dark", "light", "auto"].includes(query.get("mode"))) S.mode = query.get("mode");
  if (Object.hasOwn(D.accents, query.get("accent"))) S.accent = query.get("accent");
  if (["theme", "universal"].includes(query.get("policy"))) S.policy = query.get("policy");
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { S.mode = button.dataset.mode; D.applyTheme(); }));
  document.querySelectorAll("[data-accent]").forEach((button) => button.addEventListener("click", () => { S.accent = button.dataset.accent; D.applyTheme(); }));
  document.querySelector("#dark-policy").addEventListener("change", (event) => { S.policy = event.target.value; D.applyTheme(); });
  media.addEventListener("change", () => { if (S.mode === "auto") D.applyTheme(); });
  const formats = { bold: ["fontWeight", "650"], italic: ["fontStyle", "italic"], underline: ["textDecoration", "underline"] };
  D.syncFormat = () => {
    const cells = D.cells();
    Object.entries(formats).forEach(([action, [prop, value]]) => {
      document.querySelector(`[data-action="${action}"]`).setAttribute("aria-pressed", String(cells.length > 0 && cells.every((cell) => cell.style[prop] === value)));
    });
    ["left", "center", "right"].forEach((align) => {
      document.querySelector(`[data-action="${align}"]`).setAttribute("aria-pressed", String(cells.length > 0 && cells.every((cell) => (cell.style.textAlign || "left") === align)));
    });
  };
  D.copy = async () => {
    const b = D.bounds(); if (!b) return;
    const text = D.rows.slice(b.top, b.bottom + 1).map((row) => row.slice(b.left, b.right + 1).join("\t")).join("\n");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(text);
      D.toast("已复制选中内容");
    } catch {
      const field = document.createElement("textarea");
      field.value = text; field.style.cssText = "position:fixed;left:-9999px";
      document.body.append(field); field.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      field.remove(); D.toast(copied ? "已复制选中内容" : "浏览器未允许复制，请使用系统复制快捷键");
    }
  };
  document.querySelector(".toolbar").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || !D.bounds()) return;
    S.inactive = false;
    const action = button.dataset.action;
    if (formats[action]) {
      const [property, value] = formats[action];
      const clear = D.cells().every((cell) => cell.style[property] === value);
      D.cells().forEach((cell) => { cell.style[property] = clear ? "" : value; });
    } else if (["left", "center", "right"].includes(action)) {
      D.cells().forEach((cell) => { cell.style.textAlign = action; });
    } else if (action === "clear") {
      D.cells().forEach((cell) => cell.removeAttribute("style"));
    } else if (action === "copy") { D.copy(); }
    D.update();
  });
  let editing = null;
  const dialog = document.querySelector("#edit-dialog");
  D.editCell = (cell) => {
    editing = [Number(cell.dataset.row), Number(cell.dataset.col)];
    document.querySelector("#edit-title").textContent = `编辑 · ${D.headers[editing[1]]}`;
    document.querySelector("#edit-value").value = D.rows[editing[0]][editing[1]];
    dialog.returnValue = "cancel";
    dialog.showModal();
    document.querySelector("#edit-value").focus();
  };
  document.querySelector("#close-edit").addEventListener("click", () => dialog.close("cancel"));
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "save" && editing) {
      const [row, col] = editing;
      const value = document.querySelector("#edit-value").value;
      D.rows[row][col] = value;
      D.table.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`).textContent = value;
      D.select(editing, editing, true);
    }
    editing = null; D.updateGeometry();
  });
  document.querySelector("#reset").addEventListener("click", () => {
    D.rows = structuredClone(D.originalRows); S.custom = false; S.inactive = false;
    S.anchor = [0, 0]; S.head = [1, 3]; D.renderRows(); D.toast("演示内容已重置");
  });
  document.querySelector(".plan-link").addEventListener("click", () => { document.querySelector(".plan").open = true; });
  D.applyTheme(); D.update();
})();
