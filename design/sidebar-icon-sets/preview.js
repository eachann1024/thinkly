(() => {
  "use strict";
  const sets = window.gooseSidebarIconSets;
  const root = document.documentElement;
  const options = document.querySelector("#options");
  const status = document.querySelector("#selection");
  const storageKey = "goose-sidebar-icon-preview-v1";
  const views = [
    { key: "folder", label: "本地" },
    { key: "outline", label: "大纲" },
    { key: "search", label: "搜索" },
    { key: "settings", label: "设置" },
  ];
  let activeView = "folder";
  let selectedId = null;

  function rememberSelection(id) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ id }));
    } catch {
      // A blocked file-origin storage must not prevent using the preview.
    }
  }

  function readSelection() {
    try {
      const id = JSON.parse(localStorage.getItem(storageKey))?.id;
      if (sets.some((set) => set.id === id)) selectedId = id;
    } catch {
      selectedId = null;
    }
  }

  function icon(set, key, solid) {
    const state = solid ? "solid" : "outline";
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${set.icons[key][state]}</svg>`;
  }

  function sheetContent(view) {
    const rows = {
      folder: ["随手记", "工作札记", "读书笔记", "旅行计划"],
      outline: ["今天的想法", "一个新的开始", "把灵感记下来"],
      search: ["今天的想法", "灵感收集"],
      settings: ["通用", "外观", "快捷键", "数据"],
    };
    const label = views.find((entry) => entry.key === view).label;
    const search = view === "search" ? '<div class="search-field">今天的想法</div>' : "";
    const list = rows[view].map((text, index) =>
      `<li${view === "outline" && index ? ' class="indent"' : ""}>${text}</li>`).join("");
    return `<h3>${label}</h3>${search}<ul class="sample-list">${list}</ul>`;
  }

  function rail(set) {
    const buttons = views.map(({ key, label }) =>
      `<button class="rail-button" type="button" data-view="${key}" aria-label="${label}" title="${label}" aria-pressed="${key === activeView}">${icon(set, key, key === activeView)}</button>`).join("");
    return `<nav class="rail" aria-label="方案 ${set.id} 侧栏">${buttons}</nav>`;
  }

  function matrix(set) {
    const columns = views.map(({ label }) => `<span class="column-label">${label}</span>`).join("");
    const row = (solid) => views.map(({ key }) =>
      `<span class="${solid ? "solid-cell" : "outline-cell"}">${icon(set, key, solid)}</span>`).join("");
    return `<div class="state-grid" role="group" aria-label="${set.name} 空心和实心图标对照">
      <span aria-hidden="true"></span>${columns}
      <span class="state-label">空心</span>${row(false)}
      <span class="state-label">实心</span>${row(true)}
    </div>`;
  }

  function render() {
    options.innerHTML = sets.map((set) =>
      `<section class="option" data-set="${set.id}" aria-labelledby="set-title-${set.id}">
        <div class="option-header"><h2 id="set-title-${set.id}"><span class="set-number">${set.id}</span>${set.name}</h2></div>
        <div class="window">
          <div class="window-header" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="window-body">${rail(set)}<div class="sheet">${sheetContent(activeView)}</div></div>
        </div>
        ${matrix(set)}
        <div class="option-actions">
          <button class="choose-button" type="button" data-choose="${set.id}" aria-label="选择方案 ${set.id} ${set.name}" aria-pressed="false">选这套</button>
          <button class="original-button" type="button" data-original="${set.id}" aria-label="查看方案 ${set.id} ChatGPT 原图">原图 ↗</button>
        </div>
      </section>`).join("");
    refreshSelection();
  }

  function refreshSelection() {
    options.querySelectorAll("[data-choose]").forEach((button) => {
      const chosen = Number(button.dataset.choose) === selectedId;
      button.setAttribute("aria-pressed", String(chosen));
      button.textContent = chosen ? "已选这套" : "选这套";
    });
    const chosen = sets.find((set) => set.id === selectedId);
    status.textContent = chosen
      ? `已选方案 ${chosen.id} · ${chosen.name}。这是预览选择，待接入鹅笔记。`
      : "选一套，再接入鹅笔记。";
  }

  function changeView(view) {
    activeView = view;
    options.querySelectorAll("[data-set]").forEach((section) => {
      const set = sets.find((entry) => entry.id === Number(section.dataset.set));
      section.querySelectorAll("[data-view]").forEach((button) => {
        const active = button.dataset.view === view;
        button.setAttribute("aria-pressed", String(active));
        button.innerHTML = icon(set, button.dataset.view, active);
      });
      section.querySelector(".sheet").innerHTML = sheetContent(view);
    });
  }

  if (!Array.isArray(sets) || sets.length !== 4) {
    status.textContent = "图标资源未能加载，请确认 icon-sets.js 与本页位于同一目录。";
    return;
  }
  readSelection();
  render();
  options.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    const chooseButton = event.target.closest("[data-choose]");
    const originalButton = event.target.closest("[data-original]");
    if (viewButton) changeView(viewButton.dataset.view);
    if (chooseButton) {
      selectedId = Number(chooseButton.dataset.choose);
      rememberSelection(selectedId);
      refreshSelection();
    }
    if (originalButton) {
      const id = Number(originalButton.dataset.original);
      document.querySelector("#original-image").src = `set-${id}-raw.png`;
      document.querySelector("#original-title").textContent = `方案 ${id} · ChatGPT 原图`;
      document.querySelector("#original-dialog").showModal();
    }
  });
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.addEventListener("click", () => {
      root.dataset.theme = button.dataset.themeValue;
      document.querySelectorAll("[data-theme-value]").forEach((entry) =>
        entry.setAttribute("aria-pressed", String(entry === button)));
    });
  });
  document.querySelector("#icon-size").addEventListener("change", (event) => {
    root.style.setProperty("--icon-size", `${event.target.value}px`);
  });
})();
