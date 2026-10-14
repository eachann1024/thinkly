/* Standalone design preview: URL state only; never reads or writes application storage. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const query = new URLSearchParams(location.search);
  const notes = ["项目归档", "阅读笔记", "灵感手册", "今天的想法", "设计备忘录", "每周回顾", "工作记录"];
  const state = { theme: window.accentThemes.find((theme) => theme.id === query.get("theme")) || window.accentThemes[0], dark: query.get("mode") === "dark", active: "设计备忘录", tabs: ["设计备忘录"], editingTitle: null, composing: false, nav: "local", count: 0 };
  const escape = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const icon = (name) => `<i data-icon="${name}"></i>`;
  function syncURL() {
    const params = new URLSearchParams({ theme: state.theme.id, mode: state.dark ? "dark" : "light" });
    history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
  }
  function renderTheme() {
    document.body.classList.add("theme-changing");
    const tokens = window.accentColorMath.resolve(state.theme, state.dark);
    Object.entries(tokens).filter(([, value]) => typeof value === "string").forEach(([name, value]) => document.body.style.setProperty(`--${name}`, value));
    document.body.dataset.mode = state.dark ? "dark" : "light";
    $("#mode-toggle").setAttribute("aria-pressed", state.dark);
    $("#mode-toggle span").textContent = state.dark ? "浅色" : "深色";
    $("#preview-state").textContent = `${state.theme.name} / ${state.dark ? "深色" : "浅色"} / ${tokens.accent.toUpperCase()}`;
    $("#token-summary").textContent = `${state.theme.name} · ${state.dark ? "深色" : "浅色"}应用现行值：强调实色固定来自列表边框；文字与焦点单独适配，不反向改动原色。`;
    const roles = [
      ["accent", "强调实色 / 选中边框", "多标签选中、名称编辑、导航与列表边框"],
      ["on-accent", "实色前景", "实色背景上的文字与图标，按对比度选深浅"],
      ["accent-text", "强调文字", "链接与弱背景上的图标，保持可读性"],
      ["selected", "选中弱背景", "保留原列表的柔和底色，不当作强调实色"],
      ["focus", "键盘焦点", "独立的 2px 焦点环；标签向内绘制，避免裁切"]
    ];
    $("#token-list").innerHTML = roles.map(([key, label, detail]) => `<div class="token-row"><span class="color-chip" style="background:${tokens[key]}"></span><div><strong>${label}</strong><small>${detail}</small></div><code>${tokens[key].toUpperCase()}</code></div>`).join("");
    const { contrast } = window.accentColorMath;
    const rows = [["实色上的文字", contrast(tokens.accent, tokens["on-accent"]), 4.5], ["强调文字 / 最不利背景", Math.min(...tokens.textSurfaces.map((surface) => contrast(tokens["accent-text"], surface))), 4.5], ["原色边框 / 列表浅底", contrast(tokens.accent, tokens.selected), 3], ["焦点环 / 最不利背景", Math.min(...tokens.surfaces.map((surface) => contrast(tokens.focus, surface))), 3]];
    $("#contrast-results").innerHTML = rows.map(([label, ratio, target]) => `<div class="contrast-row" data-pass="${ratio >= target}"><span>${label}</span><strong>${ratio.toFixed(2)}:1 ${ratio >= target ? "✓" : "待补偿"}</strong></div>`).join("") + (rows.some((row) => row[1] < row[2]) ? '<div class="contrast-alert">这个主题的原色边框对比不足。预览与应用保留指定原色，焦点另行校验，不把选中边框误报为通过。</div>' : "");
    syncURL();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("theme-changing")));
  }
  function renderTabs(focusTitle) {
    $("#tabs").dataset.layout = state.tabs.length >= 4 ? "scroll" : state.tabs.length === 1 ? "fill" : "split";
    const single = state.tabs.length === 1;
    $("#tabs").innerHTML = state.tabs.map((title, index) => {
      const editing = single && state.editingTitle === title;
      const titleControl = editing
        ? `<input id="note-tab-${index}" class="workspace-title-input" data-title-input aria-label="笔记标题" value="${escape(title)}" autocomplete="off" spellcheck="false">`
        : `<button id="note-tab-${index}" class="workspace-tab" role="tab" aria-controls="document-panel" aria-selected="${title === state.active}" tabindex="${title === state.active ? 0 : -1}" data-tab="${escape(title)}" ${single ? 'aria-label="笔记标题" title="点击编辑笔记标题"' : ""}>${escape(title)}</button>`;
      return `<div class="tab-slot" data-selected="${title === state.active}" ${single ? 'data-name-bar' : ""}>${titleControl}<button class="tab-close" tabindex="-1" aria-label="关闭${escape(title)}" data-close="${escape(title)}" ${editing ? "hidden" : ""}>${icon("x")}</button></div>`;
    }).join("");
    const activeIndex = state.tabs.indexOf(state.active);
    $("#document-panel").setAttribute("aria-labelledby", `note-tab-${activeIndex}`);
    $("#document-title").textContent = state.active;
    $("#document-location").textContent = state.active;
    window.renderPreviewIcons();
    if (focusTitle) all("[data-tab]").find((tab) => tab.dataset.tab === focusTitle)?.focus();
  }
  function beginTitleEditing() {
    state.editingTitle = state.active;
    renderTabs();
    $("[data-title-input]").focus();
  }
  function finishTitleEditing(save, moveToBody = false) {
    const oldTitle = state.editingTitle;
    if (oldTitle === null) return;
    const nextTitle = save ? $("[data-title-input]").value.trim() || "未命名" : oldTitle;
    state.editingTitle = null;
    state.tabs = state.tabs.map((title) => title === oldTitle ? nextTitle : title);
    const index = notes.indexOf(oldTitle);
    if (index !== -1) notes[index] = nextTitle;
    state.active = nextTitle;
    renderTabs();
    renderNotes();
    if (moveToBody) $("#document-panel").focus();
  }
  function noteButton(title) {
    return `<button class="tree-row" data-note="${escape(title)}" ${title === state.active ? 'aria-current="page"' : ""}>${icon("file-text")}<span>${escape(title)}</span></button>`;
  }
  function renderNotes() {
    $("#note-list").innerHTML = notes.map(noteButton).join("");
    const keyword = $("#search-input").value.trim();
    const found = notes.filter((title) => title.includes(keyword));
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
  function revealAnchor(id) {
    const target = document.getElementById(id);
    const details = target?.closest("details");
    if (details) details.open = true;
    target?.scrollIntoView({ behavior: "instant", block: "start" });
    if (target) { if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  }
  $("#theme-select").innerHTML = window.accentThemes.map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join("");
  $("#theme-select").value = state.theme.id;
  $("#theme-select").addEventListener("change", (event) => { state.theme = window.accentThemes.find((theme) => theme.id === event.target.value); renderTheme(); });
  $("#mode-toggle").addEventListener("click", () => { state.dark = !state.dark; renderTheme(); });
  $("#tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    const close = event.target.closest("[data-close]");
    if (tab) { if (state.tabs.length === 1) beginTitleEditing(); else openNote(tab.dataset.tab, true); }
    if (close) closeNote(close.dataset.close);
  });
  $("#tabs").addEventListener("keydown", (event) => {
    if (event.target.matches("[data-title-input]")) {
      if (event.isComposing || state.composing) return;
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        finishTitleEditing(event.key === "Enter", event.key === "Enter");
      }
      return;
    }
    if (!event.target.matches("[role=tab]")) return;
    if (event.key === "Delete") { event.preventDefault(); closeNote(event.target.dataset.tab); return; }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const index = state.tabs.indexOf(event.target.dataset.tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? state.tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + state.tabs.length) % state.tabs.length;
    openNote(state.tabs[next], true);
  });
  $("#tabs").addEventListener("compositionstart", () => { state.composing = true; });
  $("#tabs").addEventListener("compositionend", () => { state.composing = false; });
  $("#tabs").addEventListener("focusout", (event) => {
    if (event.target.matches("[data-title-input]") && !state.composing) finishTitleEditing(true);
  });
  document.addEventListener("click", (event) => {
    const note = event.target.closest("[data-note]");
    if (note) { const panelId = note.parentElement.id; const title = note.dataset.note; openNote(title); [...document.getElementById(panelId).querySelectorAll("[data-note]")].find((button) => button.dataset.note === title)?.focus(); }
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) { event.preventDefault(); revealAnchor(anchor.getAttribute("href").slice(1)); }
  });
  all("[data-nav]").forEach((button) => button.addEventListener("click", () => { state.nav = button.dataset.nav; renderNav(); }));
  $("#folder-toggle").addEventListener("click", () => { const expanded = $("#folder-toggle").getAttribute("aria-expanded") !== "true"; $("#folder-toggle").setAttribute("aria-expanded", expanded); $("#note-list").hidden = !expanded; });
  $("#search-input").addEventListener("input", renderNotes);
  $(".new-tab").addEventListener("click", addNote);
  $("#sidebar-add").addEventListener("click", addNote);
  all("[data-jump]").forEach((button) => button.addEventListener("click", () => revealAnchor(button.dataset.jump)));
  $("#jump-theme").addEventListener("click", () => { $("#theme-select").focus(); $("#theme-select").scrollIntoView(); });
  renderTheme(); renderTabs(); renderNotes(); renderNav();
  if (location.hash) revealAnchor(location.hash.slice(1));
})();
