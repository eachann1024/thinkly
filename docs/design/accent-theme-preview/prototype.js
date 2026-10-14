/* Standalone design preview: URL state only; never reads or writes application storage. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const query = new URLSearchParams(location.search);
  const variants = { A: "实色焦点", B: "精准轮廓", C: "轻量标记" };
  const descriptions = { A: "A · 顶部与导航，直接使用真实强调实色。", B: "B · 同一条实色边框，从列表延续到顶部和导航。", C: "C · 以实色指示线和图标，标记当前工作位置。" };
  const notes = ["项目归档", "阅读笔记", "灵感手册", "今天的想法", "设计备忘录", "每周回顾", "工作记录"];
  const state = { variant: variants[query.get("variant")] ? query.get("variant") : "A", theme: window.accentThemes.find((theme) => theme.id === query.get("theme")) || window.accentThemes[0], dark: query.get("mode") === "dark", active: "设计备忘录", tabs: ["灵感手册", "阅读笔记", "设计备忘录"], nav: "local", sort: "recent", reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, count: 0 };
  const escape = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const icon = (name) => `<i data-icon="${name}"></i>`;
  function syncURL() {
    const params = new URLSearchParams({ variant: state.variant, theme: state.theme.id, mode: state.dark ? "dark" : "light" });
    history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
  }
  function renderVariant() {
    document.body.dataset.variant = state.variant;
    all("[data-variant-choice]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.variantChoice === state.variant));
    $("#current-variant").textContent = `${state.variant} · ${variants[state.variant]}`;
    $("#variant-description").textContent = descriptions[state.variant];
    syncURL();
  }
  function renderTheme() {
    document.body.classList.add("theme-changing");
    const tokens = window.accentColorMath.resolve(state.theme, state.dark);
    Object.entries(tokens).filter(([, value]) => typeof value === "string").forEach(([name, value]) => document.body.style.setProperty(`--${name}`, value));
    document.body.dataset.mode = state.dark ? "dark" : "light";
    $("#mode-toggle").setAttribute("aria-pressed", state.dark);
    $("#mode-toggle span").textContent = state.dark ? "浅色" : "深色";
    $("#preview-state").textContent = `${state.theme.name} / ${state.dark ? "深色候选" : "浅色"} / ${tokens.accent.toUpperCase()}`;
    $("#token-summary").textContent = `${state.theme.name} · ${state.dark ? "深色恢复候选" : "浅色现行值"}：强调实色固定来自列表边框；文字与焦点单独适配，不反向改动原色。`;
    const roles = [
      ["accent", "强调实色 / 选中边框", "顶部、导航、主要动作、列表边框"],
      ["on-accent", "实色前景", "实色背景上的文字与图标，按对比度选深浅"],
      ["accent-text", "强调文字", "链接与弱背景上的图标，保持可读性"],
      ["selected", "选中弱背景", "保留原列表的柔和底色，不当作强调实色"],
      ["focus", "键盘焦点", "独立的 2px 外置焦点环，与选中状态分离"]
    ];
    $("#token-list").innerHTML = roles.map(([key, label, detail]) => `<div class="token-row"><span class="color-chip" style="background:${tokens[key]}"></span><div><strong>${label}</strong><small>${detail}</small></div><code>${tokens[key].toUpperCase()}</code></div>`).join("");
    const { contrast } = window.accentColorMath;
    const rows = [["实色上的文字", contrast(tokens.accent, tokens["on-accent"]), 4.5], ["强调文字 / 最不利背景", Math.min(...tokens.surfaces.map((surface) => contrast(tokens["accent-text"], surface))), 4.5], ["原色边框 / 列表浅底", contrast(tokens.accent, tokens.selected), 3], ["焦点环 / 最不利背景", Math.min(...tokens.surfaces.map((surface) => contrast(tokens.focus, surface))), 3]];
    $("#contrast-results").innerHTML = rows.map(([label, ratio, target]) => `<div class="contrast-row" data-pass="${ratio >= target}"><span>${label}</span><strong>${ratio.toFixed(2)}:1 ${ratio >= target ? "✓" : "待补偿"}</strong></div>`).join("") + (rows.some((row) => row[1] < row[2]) ? '<div class="contrast-alert">这个主题的原色边框对比不足。预览保留你指定的原色；正式实现需补足独立可辨识边界，不把弱色误报为通过。</div>' : "");
    syncURL();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("theme-changing")));
  }
  function renderTabs(focusTitle) {
    $("#tabs").dataset.layout = state.tabs.length >= 4 ? "scroll" : state.tabs.length === 1 ? "fill" : "split";
    $("#tabs").innerHTML = state.tabs.map((title, index) => `<div class="tab-slot" data-selected="${title === state.active}"><button id="note-tab-${index}" class="workspace-tab" role="tab" aria-controls="document-panel" aria-selected="${title === state.active}" tabindex="${title === state.active ? 0 : -1}" data-tab="${escape(title)}">${escape(title)}</button><button class="tab-close" tabindex="-1" aria-label="关闭${escape(title)}" data-close="${escape(title)}">${icon("x")}</button></div>`).join("");
    const activeIndex = state.tabs.indexOf(state.active);
    $("#document-panel").setAttribute("aria-labelledby", `note-tab-${activeIndex}`);
    $("#document-title").textContent = state.active;
    $("#document-location").textContent = state.active;
    window.renderPreviewIcons();
    if (focusTitle) all("[data-tab]").find((tab) => tab.dataset.tab === focusTitle)?.focus();
  }
  function noteButton(title) {
    return `<button class="tree-row" data-note="${escape(title)}" ${title === state.active ? 'aria-current="page"' : ""}>${icon("file-text")}<span>${escape(title)}</span></button>`;
  }
  function renderNotes() {
    const sorted = state.sort === "name" ? [...notes].sort((a, b) => a.localeCompare(b, "zh-CN")) : notes;
    $("#note-list").innerHTML = sorted.map(noteButton).join("");
    const keyword = $("#search-input").value.trim();
    const found = sorted.filter((title) => title.includes(keyword));
    $("#search-results").innerHTML = found.length ? found.map(noteButton).join("") : '<p class="panel-label">没有匹配的示例笔记</p>';
    window.renderPreviewIcons();
  }
  function openNote(title, focus = false) {
    if (!state.tabs.includes(title)) state.tabs.push(title);
    state.active = title;
    renderTabs(focus ? title : null);
    renderNotes();
  }
  function closeNote(title) {
    const index = state.tabs.indexOf(title);
    const wasActive = state.active === title;
    state.tabs.splice(index, 1);
    if (!state.tabs.length) state.tabs.push(notes.find((item) => item !== title) || "设计备忘录");
    if (wasActive) state.active = state.tabs[Math.min(index, state.tabs.length - 1)];
    renderTabs(state.active);
    renderNotes();
  }
  function addNote() {
    const title = `新笔记 ${++state.count}`;
    notes.push(title);
    openNote(title, true);
  }
  function renderNav() {
    const names = { local: "本地", outline: "大纲", search: "搜索", settings: "设置" };
    all("[data-nav]").forEach((button) => button.dataset.nav === state.nav ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current"));
    all(".sidebar-panel").forEach((panel) => panel.hidden = panel.id !== `${state.nav}-panel`);
    $("#sidebar-title").textContent = names[state.nav];
    $("#sidebar-add").hidden = state.nav !== "local";
    if (state.nav === "search") $("#search-input").focus();
  }
  function changeVariant(delta) {
    const keys = Object.keys(variants);
    state.variant = keys[(keys.indexOf(state.variant) + delta + keys.length) % keys.length];
    renderVariant();
  }
  function revealAnchor(id) {
    const target = document.getElementById(id);
    const details = target?.closest("details");
    if (details) details.open = true;
    target?.scrollIntoView({ behavior: "instant", block: "start" });
    if (target) { if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }
  function renderControlState() {
    $("#interaction-state").textContent = `示例状态：自动保存${$("#sync-switch").getAttribute("aria-checked") === "true" ? "开" : "关"} · 排序${state.sort === "name" ? "名称" : "最近编辑"} · 动效${state.reduced ? "已减弱" : "150ms 轻过渡"}。主题与方案切换写入当前 URL，不写入应用设置。`;
  }
  all("[data-variant-choice]").forEach((button) => button.addEventListener("click", () => { state.variant = button.dataset.variantChoice; renderVariant(); }));
  $("#previous-variant").addEventListener("click", () => changeVariant(-1));
  $("#next-variant").addEventListener("click", () => changeVariant(1));
  $("#theme-select").innerHTML = window.accentThemes.map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join("");
  $("#theme-select").value = state.theme.id;
  $("#theme-select").addEventListener("change", (event) => { state.theme = window.accentThemes.find((theme) => theme.id === event.target.value); renderTheme(); });
  $("#mode-toggle").addEventListener("click", () => { state.dark = !state.dark; renderTheme(); });
  $("#reduce-motion").checked = state.reduced;
  $("#reduce-motion").disabled = matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("#reduce-motion").addEventListener("change", (event) => { state.reduced = event.target.checked; document.body.dataset.reduce = String(state.reduced); renderControlState(); });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => { state.reduced = event.matches; $("#reduce-motion").disabled = event.matches; $("#reduce-motion").checked = state.reduced; document.body.dataset.reduce = String(state.reduced); renderControlState(); });
  $("#tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    const close = event.target.closest("[data-close]");
    if (tab) openNote(tab.dataset.tab, true);
    if (close) closeNote(close.dataset.close);
  });
  $("#tabs").addEventListener("keydown", (event) => {
    if (!event.target.matches("[role=tab]")) return;
    if (event.key === "Delete") { event.preventDefault(); closeNote(event.target.dataset.tab); return; }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const index = state.tabs.indexOf(event.target.dataset.tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? state.tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + state.tabs.length) % state.tabs.length;
    openNote(state.tabs[next], true);
  });
  document.addEventListener("click", (event) => {
    const note = event.target.closest("[data-note]");
    if (note) { const panelId = note.parentElement.id; const title = note.dataset.note; openNote(title); [...document.getElementById(panelId).querySelectorAll("[data-note]")].find((button) => button.dataset.note === title)?.focus(); }
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) { event.preventDefault(); revealAnchor(anchor.getAttribute("href").slice(1)); }
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable], [role=tablist]')) return;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); changeVariant(event.key === "ArrowRight" ? 1 : -1); }
  });
  all("[data-nav]").forEach((button) => button.addEventListener("click", () => { state.nav = button.dataset.nav; renderNav(); }));
  $("#folder-toggle").addEventListener("click", () => { const expanded = $("#folder-toggle").getAttribute("aria-expanded") !== "true"; $("#folder-toggle").setAttribute("aria-expanded", expanded); $("#note-list").hidden = !expanded; });
  $("#search-input").addEventListener("input", renderNotes);
  $(".new-tab").addEventListener("click", addNote);
  $("#sidebar-add").addEventListener("click", addNote);
  all("[data-jump]").forEach((button) => button.addEventListener("click", () => revealAnchor(button.dataset.jump)));
  $("#jump-theme").addEventListener("click", () => { $("#theme-select").focus(); $("#theme-select").scrollIntoView(); });
  $("#jump-controls").addEventListener("click", () => revealAnchor("controls"));
  $("#sync-switch").addEventListener("click", () => { const button = $("#sync-switch"); button.setAttribute("aria-checked", button.getAttribute("aria-checked") !== "true"); renderControlState(); });
  all('input[name="sort"]').forEach((input) => input.addEventListener("change", () => { state.sort = input.value; renderNotes(); renderControlState(); }));
  $("#show-example-mark").addEventListener("change", (event) => { $(".sidebar-footer span").hidden = !event.target.checked; });
  $("#primary-action").addEventListener("click", () => { $("#primary-action span").textContent = "已完成"; $("#action-status").textContent = "已更新示例状态"; });
  $("#save-example").addEventListener("click", () => { $("#save-status").textContent = "示例已保存；刷新后恢复初始状态。"; });
  $("#secondary-example").addEventListener("click", () => revealAnchor("workspace"));
  document.body.dataset.reduce = String(state.reduced);
  renderVariant(); renderTheme(); renderTabs(); renderNotes(); renderNav(); renderControlState();
  if (location.hash) revealAnchor(location.hash.slice(1));
})();
