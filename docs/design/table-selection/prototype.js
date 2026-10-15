(() => {
  const D = window.TableDesign;
  const root = document.documentElement;
  D.design = root.dataset.design;
  D.icon = (name) => window.TableIcons[name] || "";
  D.escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  D.state = { anchor: [0, 0], head: [1, 3], inactive: false, accent: "pine", mode: "light", policy: "universal", custom: false, context: "grid", condition: "normal", sampleSelected: true };
  D.originalRows = structuredClone(D.rows);
  const note = D.notes[D.design];
  document.querySelector("#app").innerHTML = `
    <header class="preview-bar">
      <div class="brand">${D.icon("Feather")}<span>Goose Notes</span></div>
      <div class="mode-switch" role="group" aria-label="明暗模式">
        <button data-mode="light" aria-pressed="true">${D.icon("Sun")}浅色</button>
        <button data-mode="dark" aria-pressed="false">${D.icon("Moon")}深色</button>
        <button data-mode="auto" aria-pressed="false">${D.icon("Desktop")}系统</button>
      </div>
      <a class="plan-link" href="#improvement-plan">改进方案</a>
    </header>
    <main>
      <section class="preview-settings" aria-label="预览设置">
        <div class="theme-field"><span>主题色</span><div class="swatches" role="group" aria-label="主题色">
          ${Object.entries(D.accents).map(([key, value]) => `<button class="swatch" data-accent="${key}" aria-label="${value.name}" title="${value.name}" aria-pressed="${key === "pine"}" style="--swatch:${value.light}"><i></i></button>`).join("")}
        </div></div>
        <label class="dark-policy">深色选区
          <select id="dark-policy" aria-label="深色选区配色"><option value="universal">通用蓝</option><option value="theme">跟随主题</option></select>
        </label>
        <label class="ai-width-field">AI 宽度
          <select id="ai-panel-width" aria-label="AI 侧栏预览宽度"><option value="280">280 · 紧凑</option><option value="320">320</option><option value="338" selected>338 · 默认</option><option value="400">400</option></select>
        </label>
      </section>
      <section class="context-controls" aria-label="工具栏场景">
        <div class="context-tabs" role="group" aria-label="选中内容"></div>
        <label class="state-field">状态
          <select id="selection-state" aria-label="选区状态">
            <option value="normal">正常选中</option><option value="mixed">格式混合</option>
            <option value="readonly">只读</option><option value="inactive">失焦</option>
            <option value="empty">无选区</option><option value="busy">复制中 · 演示</option>
            <option value="error">复制失败 · 演示</option>
          </select>
        </label>
      </section>
      <section class="workspace" aria-label="${note[0]}编辑器预览">
        <div class="document-bar"><div class="breadcrumb">个人笔记 ${D.icon("CaretRight")} 设备与软件</div><div class="document-controls"><span class="optional-label">交互预览 · 未连接模型</span><button id="chat-toggle" aria-controls="ai-panel" aria-expanded="false">${D.icon("Sparkle")}AI 助手</button></div></div>
        <div class="document-layout">
        <article class="document">
          <div class="document-title"><h1>配置清单</h1><button id="custom-background" aria-pressed="false" title="给第一行说明单元格添加原有底色">原有底色</button></div>
          <div class="toolbar-slot">
            <div class="toolbar" id="selection-toolbar" role="toolbar" aria-label="选区格式"></div>
            <div class="selection-idle" hidden>选中内容后显示工具栏</div>
          </div>
          <div class="block-stage" hidden tabindex="-1" aria-label="内容块预览"></div>
          <div class="table-stage">
          <div class="grid-viewport" tabindex="0" aria-label="表格，可横向滚动">
            <div class="grid-wrap"><div class="row-gutter" aria-label="行选择"></div>
              <table class="data-table" role="grid" aria-label="配置清单" aria-multiselectable="true">
                <colgroup><col style="width:18%"><col style="width:26%"><col style="width:33%"><col style="width:23%"></colgroup>
                <thead><tr>${D.headers.map((text, col) => `<th scope="col" role="columnheader"><button data-column="${col}" aria-label="选择${text}整列">${text}${D.icon("CaretDown")}</button></th>`).join("")}</tr></thead>
                <tbody></tbody>
              </table>
              <div class="range-border" aria-hidden="true"></div>
            </div>
          </div>
          <button class="append-row" id="append-row">${D.icon("Plus")}<span>添加一行</span></button>
          <div class="ai-insertions" aria-label="插入的内容"></div>
          </div>
          <div class="editor-bottom"><span id="interaction-hint">拖动框选 · Shift 扩选 · 双击编辑 · Esc 取消</span><button class="focus-toggle" id="focus-toggle" aria-pressed="false">预览失焦</button></div>
        </article>
        <aside class="ai-panel" id="ai-panel" aria-labelledby="ai-title" hidden></aside>
        </div>
      </section>
      <section class="demo-controls" aria-label="选区状态预览">
        <div class="presets" role="group" aria-label="选区范围"><span>试试选区</span>
          ${[["single", "单格"], ["range", "多格"], ["rows", "整行"], ["column", "整列"], ["none", "无选区"]].map(([key, text]) => `<button data-preset="${key}" aria-pressed="${key === "rows"}">${text}</button>`).join("")}
        </div>
        <button class="reset" id="reset">${D.icon("ArrowCounterClockwise")}重置演示</button>
      </section>
      <div class="design-note"><strong>${note[0]}</strong><p>${note[1]}</p></div>
      <details class="plan" id="improvement-plan">
        <summary>问题与改进方案</summary>
        <div class="plan-content">
          <p class="plan-intro">动态工具栏按选区能力显示操作，独立留位，不遮挡内容。以下观察依据截图与本地源码；本页是独立 HTML 原型。</p>
          ${D.findings.map(([title, issue, solution]) => `<div class="finding"><strong>${title}</strong><p>${issue}</p><p>${solution}</p></div>`).join("")}
          <h3>实施顺序</h3><ol>${D.plans.map((text) => `<li>${text}</li>`).join("")}</ol>
          <h3>工具栏与交互改进</h3><div id="toolbar-plan"></div>
          <h3>本次可体验</h3><p class="plan-intro">文字格式、颜色、链接、对齐、图片预览、JSON 格式化、附件下载、复制与本页撤销均可操作。加入对话会携带选区引用，支持发送、本地演示回复、停止、失败重试、结果编辑、插入或替换与撤销。窄窗口的低频操作收入更多菜单。</p>
          <h3>边界</h3><p class="plan-intro">所有改动仅保存在当前页面内存中，重置或刷新恢复。对话使用离线规则演示，不连接 AI 模型、真实笔记或文件系统；未复现正式编辑器的合并单元格、拖拽排序、跨表选区与导出。正式接入后需从主窗口和独立速记入口验收真实服务与持久化。</p>
        </div>
      </details>
    </main>
    <dialog class="dialog" id="edit-dialog" aria-labelledby="edit-title">
      <form method="dialog" id="edit-form"><div class="dialog-head"><h2 id="edit-title">编辑单元格</h2><button type="button" id="close-edit" aria-label="关闭">${D.icon("X")}</button></div>
      <label class="sr-only" for="edit-value">单元格内容</label><textarea id="edit-value"></textarea>
      <div class="dialog-actions"><button value="cancel">取消</button><button class="primary" value="save">保存</button></div></form>
    </dialog>
    <dialog class="dialog preview-dialog" id="preview-dialog" aria-labelledby="preview-title">
      <div class="dialog-head"><h2 id="preview-title">内容预览</h2><button id="close-preview" aria-label="关闭预览">${D.icon("X")}</button></div>
      <div id="preview-body"></div>
    </dialog>
    <div class="toolbar-popover" id="toolbar-popover" hidden></div>
    <div class="toolbar-tooltip" id="toolbar-tooltip" role="tooltip" hidden></div>
    <div class="sr-only" id="toolbar-live" role="status" aria-live="polite"></div>
    <div class="toast" role="status" hidden></div>`;
  D.table = document.querySelector(".data-table");
  D.wrap = document.querySelector(".grid-wrap");
  D.renderRows = () => {
    D.table.querySelector("tbody").innerHTML = D.rows.map((row, r) => `<tr role="row">${row.map((value, c) =>
      `<td role="gridcell" data-row="${r}" data-col="${c}" tabindex="-1" aria-selected="false"><span class="cell-content ${c === 2 && value !== "—" ? "identifier" : ""}">${D.escape(value)}</span></td>`
    ).join("")}</tr>`).join("");
    D.wrap.querySelector(".row-gutter").innerHTML = D.rows.map((_, index) =>
      `<button class="row-handle" data-select-row="${index}" aria-label="选择第 ${index + 1} 行" aria-pressed="false">${D.icon("DotsSixVertical")}</button>`
    ).join("");
    D.update?.();
  };
  D.toast = (text) => {
    const node = document.querySelector(".toast");
    node.textContent = text; node.hidden = false;
    clearTimeout(D.toastTimer);
    D.toastTimer = setTimeout(() => { node.hidden = true; }, 2300);
  };
  D.renderRows();
})();
