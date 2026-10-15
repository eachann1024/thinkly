(() => {
  const D = window.TableDesign;
  const root = document.documentElement;
  D.design = root.dataset.design;
  D.icon = (name) => window.TableIcons[name] || "";
  D.escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  D.state = { anchor: [0, 0], head: [1, 3], inactive: false, accent: "pine", mode: "light", policy: "universal", custom: false };
  D.originalRows = structuredClone(D.rows);
  const button = (name, label, action, extra = "") =>
    `<button type="button" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${D.icon(name)}</button>`;
  const note = D.notes[D.design];
  document.querySelector("#app").innerHTML = `
    <header class="preview-bar">
      <div class="brand">${D.icon("Feather")}<span>Goose Notes</span></div>
      <nav class="versions" aria-label="设计版本">
        <a href="theme-tint.html" ${D.design === "tint" ? 'aria-current="page"' : ""}>A · 主题轻染</a>
        <a href="quiet-frame.html" ${D.design === "frame" ? 'aria-current="page"' : ""}>B · 清晰边界</a>
      </nav>
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
      </section>
      <section class="workspace" aria-label="${note[0]}编辑器预览">
        <div class="document-bar"><div class="breadcrumb">个人笔记 ${D.icon("CaretRight")} 设备与软件</div><span><span class="optional-label">设计预览 · </span>虚构数据</span></div>
        <article class="document">
          <div class="document-title"><h1>配置清单</h1><button id="custom-background" aria-pressed="false" title="给第一行说明单元格添加原有底色">原有底色</button></div>
          <div class="toolbar-slot">
            <div class="toolbar" role="toolbar" aria-label="选区格式">
              <span class="selection-label" aria-live="polite">2 行 × 4 列</span><span class="separator"></span>
              ${button("TextB", "加粗", "bold", 'aria-pressed="false"')}
              ${button("TextItalic", "斜体", "italic", 'aria-pressed="false"')}
              ${button("TextUnderline", "下划线", "underline", 'aria-pressed="false" class="secondary-tool"')}
              <span class="separator"></span>
              ${button("TextAlignLeft", "左对齐", "left", 'aria-pressed="true"')}
              ${button("TextAlignCenter", "居中对齐", "center", 'aria-pressed="false"')}
              ${button("TextAlignRight", "右对齐", "right", 'aria-pressed="false" class="secondary-tool"')}
              <span class="separator"></span>
              <button data-action="copy" aria-label="复制选中内容" title="复制选中内容">${D.icon("Copy")}<span class="tool-label">复制</span></button>
              ${button("Eraser", "清除选中格式", "clear", 'class="secondary-tool"')}
            </div>
          </div>
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
          <div class="editor-bottom"><span>拖动框选 · Shift 扩选 · 双击编辑 · Esc 取消</span><button class="focus-toggle" id="focus-toggle" aria-pressed="false">预览失焦</button></div>
        </article>
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
          <p class="plan-intro">建议先落地 A 的配色和工具栏避让，再按偏好采用 B 的弱网格。以下观察依据你提供的截图与本地源码；两版均为独立 HTML 原型。</p>
          ${D.findings.map(([title, issue, solution]) => `<div class="finding"><strong>${title}</strong><p>${issue}</p><p>${solution}</p></div>`).join("")}
          <h3>实施顺序</h3><ol>${D.plans.map((text) => `<li>${text}</li>`).join("")}</ol>
          <h3>本次可体验</h3><p class="plan-intro">九种主题色、明暗 / 系统切换、深色配色策略、鼠标拖选、Shift 扩选、方向键、复制、格式操作、双击编辑、新增行、失焦及原有单元格底色。演示内容仅在当前页内存中保存，重置或刷新即可恢复。</p>
          <h3>边界</h3><p class="plan-intro">原型不连接笔记、AI 或文件系统；未复现正式编辑器的合并单元格、撤销历史、拖拽排序、跨表选区与导出。截图不能证明实际焦点行为与可访问性完整合规，正式接入后需从主窗口和独立速记入口验收。</p>
        </div>
      </details>
    </main>
    <dialog class="dialog" id="edit-dialog" aria-labelledby="edit-title">
      <form method="dialog" id="edit-form"><div class="dialog-head"><h2 id="edit-title">编辑单元格</h2><button type="button" id="close-edit" aria-label="关闭">${D.icon("X")}</button></div>
      <label class="sr-only" for="edit-value">单元格内容</label><textarea id="edit-value"></textarea>
      <div class="dialog-actions"><button value="cancel">取消</button><button class="primary" value="save">保存</button></div></form>
    </dialog>
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
