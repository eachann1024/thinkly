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
    Object.entries(D.accents).forEach(([name, colors]) => {
      root.style.setProperty(`--tone-${name}`, dark ? colors.dark : colors.light);
      root.style.setProperty(`--marker-${name}`, `rgba(${hexRgb(dark ? colors.dark : colors.light)}, .18)`);
    });
    document.querySelectorAll("[data-mode]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === S.mode)));
    document.querySelectorAll("[data-accent]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.accent === S.accent)));
    document.querySelector("#dark-policy").disabled = !dark;
    document.querySelector(".dark-policy").dataset.disabled = String(!dark);
    document.querySelector("#dark-policy").value = S.policy;
    const query = new URLSearchParams({ mode: S.mode, accent: S.accent, policy: S.policy, context: S.context });
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
  let editing = null;
  const dialog = document.querySelector("#edit-dialog");
  D.editCell = (cell) => {
    if (S.condition === "readonly") return D.toast("只读内容，无法修改");
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
      D.remember();
      const [row, col] = editing;
      const value = document.querySelector("#edit-value").value;
      D.rows[row][col] = value;
      D.table.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`).textContent = value;
      D.select(editing, editing, true);
    }
    editing = null; D.updateGeometry(); D.focusSelection();
  });
  document.querySelector("#reset").addEventListener("click", () => {
    D.closePopover(false); D.clearNativeRange(); D.nativeTarget = null;
    D.sampleCache = {}; D.stage.replaceChildren(); D.history = []; D.resetAssets();
    D.rows = structuredClone(D.originalRows); S.custom = false; S.inactive = false;
    S.anchor = [0, 0]; S.head = [1, 3]; S.condition = "normal"; D.copyStatus = "idle";
    D.renderRows(); D.setContext("grid"); D.toast("演示内容已重置");
  });
  document.querySelector(".plan-link").addEventListener("click", () => { document.querySelector(".plan").open = true; });
  D.applyTheme();
  D.setContext(Object.hasOwn(D.contexts, query.get("context")) ? query.get("context") : "grid");
  D.update();
})();
