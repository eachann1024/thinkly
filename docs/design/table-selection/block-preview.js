(() => {
  const D = window.TableDesign, S = D.state;
  D.contexts = {
    text: ["正文", "Note"], heading: ["标题", "TextH"], list: ["列表", "ListBullets"],
    quote: ["引用", "Quotes"], grid: ["表格", "Table"], cell: ["格内文字", "TextIndent"],
    image: ["图片", "Image"], code: ["代码", "Code"], link: ["链接", "Link"],
    file: ["附件", "FileCode"], mixed: ["多块", "Rows"],
  };
  D.imageSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 380" role="img" aria-label="湖畔山色">
    <rect width="800" height="380" fill="#dce7df"/><circle cx="622" cy="97" r="34" fill="#f5eedb"/>
    <path d="M0 251 166 73 345 266 466 145 680 286 800 216V380H0Z" fill="#738c7d"/>
    <path d="m0 302 203-132 143 98 193-89 261 105v96H0Z" fill="#456b60"/>
    <path d="M0 304q180-17 390 9t410-3v70H0Z" fill="#b4c8c0"/>
    <path d="M270 335h280M362 352h271" fill="none" stroke="#e6eee7" stroke-width="2"/>
  </svg>`;
  const text = (value) => `<span data-format>${value}</span>`;
  const sample = (kind, body, extra = "") => `<div class="sample-block is-block-selected" data-block="${kind}" tabindex="0" ${extra}>${body}</div>`;
  D.sampleMarkup = {
    text: sample("text", `<p>${text("让想法有处安放，")}${text("让重要的事清晰可见。")}</p><p>整理设备、连接与日常灵感，从一份清单开始。</p>`),
    heading: sample("heading", `<h2 data-heading="2">${text("每一条记录，都值得被认真对待")}</h2>`),
    list: sample("list", `<ul class="sample-list"><li>${text("整理常用设备与许可证")}</li><li>${text("补充远程连接说明")}</li><li>${text("把零散信息放回合适的位置")}</li></ul>`),
    quote: sample("quote", `<blockquote><p>${text("好的记录不是堆积，")}${text("而是为下一次想起留一个入口。")}</p></blockquote>`),
    image: sample("image", `<figure class="sample-image" data-align="center">${D.imageSvg}<figcaption>湖畔山色 · SVG 演示插画</figcaption></figure>`),
    code: sample("code", `<div class="code-caption"><span data-code-language>JSON</span><span>preferences.json</span></div><pre class="sample-code" data-wrap="false"><code>{"workspace":"湖畔工作室","theme":"pine","devices":["iPad","MacBook Pro"],"note":"A quiet place for notes, connections and ideas."}</code></pre>`),
    link: sample("link", `<p>把相关资料放在触手可及的位置。</p><p><a class="sample-link" data-link href="https://example.com/" target="_blank" rel="noopener noreferrer">工作室参考资料 ${D.icon("ArrowSquareOut")}</a></p>`),
    file: sample("file", `<div class="sample-file">${D.icon("FileCode")}<div><strong data-filename>工作室配置说明.txt</strong><p data-file-meta>文本附件 · 本页演示文件</p></div><button id="choose-file" class="surface-button">更换文件</button></div><pre class="file-content">工作室配置说明\n\n设备：iPad / MacBook Pro\n许可证：DEMO-ONLY\n备注：此文件仅用于交互预览。</pre><input id="sample-file-input" type="file" hidden>`),
    mixed: sample("text", `<p>${text("整理过的信息，")}${text("能为下一次工作节省时间。")}</p>`)
      + sample("quote", `<blockquote><p>${text("把设备与资料，放进同一份清单。")}</p></blockquote>`)
      + sample("image", `<figure class="sample-image compact" data-align="center">${D.imageSvg}</figure>`),
  };
  D.stage = document.querySelector(".block-stage");
  D.sampleCache = {};
  D.isTable = () => ["grid", "cell"].includes(S.context);
  D.selectedBlocks = () => [...D.stage.querySelectorAll(".is-block-selected")];
  D.activeContext = () => D.isTable() ? S.context : D.selectedBlocks().length > 1 ? "mixed" : D.selectedBlocks()[0]?.dataset.block || S.context;
  D.hasSelection = () => S.condition !== "empty" && (D.isTable() ? Boolean(D.bounds?.()) : S.sampleSelected);
  D.getTargets = () => {
    if (D.isTable()) return S.context === "grid" ? D.cells() : D.cells().flatMap(cell => [...cell.querySelectorAll("[data-fragment], .cell-content:not(:has([data-fragment]))")]);
    return D.selectedBlocks().flatMap(node => [...node.querySelectorAll("[data-format]:not(:has([data-format]))")]);
  };
  D.getAlignTargets = () => D.isTable() ? D.cells() : D.selectedBlocks().map(node => node.querySelector("figure, p, ul, ol, h2, h3, blockquote") || node);
  D.clearNativeRange = () => { D.savedRange = null; window.getSelection()?.removeAllRanges(); };
  D.restoreRange = () => {
    if (!D.savedRange?.startContainer.isConnected) return;
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(D.savedRange);
  };
  D.materializeRange = () => {
    const range = D.savedRange;
    if (!range || range.collapsed || !range.startContainer.isConnected) return;
    const parent = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (!parent.closest("[data-format], .cell-content")) return;
    const span = document.createElement("span");
    span.setAttribute(D.isTable() ? "data-fragment" : "data-format", "");
    span.append(range.extractContents()); range.insertNode(span);
    const next = document.createRange(); next.selectNodeContents(span);
    D.savedRange = next; D.nativeTarget = span; D.restoreRange();
  };
  D.formatTargets = () => D.nativeTarget?.isConnected && D.savedRange ? [D.nativeTarget] : D.getTargets();
  D.setContext = (key) => {
    if (!D.contexts[key]) return;
    if (!D.isTable()) D.sampleCache[S.context] = D.stage.innerHTML;
    D.closePopover?.(false); D.clearNativeRange(); D.nativeTarget = null;
    S.context = key; S.sampleSelected = true; S.condition = "normal"; S.inactive = false;
    D.stage.hidden = D.isTable();
    document.querySelector(".table-stage").hidden = !D.isTable();
    document.querySelector(".presets").hidden = !D.isTable();
    document.querySelector("#custom-background").hidden = !D.isTable();
    document.querySelector(".document h1").textContent = D.isTable() ? "配置清单" : "工作室手记";
    if (D.isTable()) {
      S.anchor = [0, 0]; S.head = key === "cell" ? [0, 0] : [1, 3];
    } else D.stage.innerHTML = D.sampleCache[key] || D.sampleMarkup[key];
    document.querySelectorAll("[data-context]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.context === key)));
    document.querySelector("#selection-state").value = "normal";
    document.querySelector("#selection-state option[value=mixed]").disabled = !["grid", "cell", "text", "quote", "list"].includes(key);
    document.querySelector("#interaction-hint").textContent = D.isTable() ? key === "cell" ? "拖选格内文字 · Alt + F10 进入工具栏 · Esc 取消" : "拖动框选 · Shift 扩选 · 双击编辑 · Esc 取消" : key === "mixed" ? "点击选择块 · Shift 扩选 · Alt + F10 进入工具栏" : "点击选择块 · Alt + F10 进入工具栏 · Esc 取消";
    document.querySelector(".workspace").dataset.context = key;
    D.syncPreviewState(); D.update?.(); D.applyTheme?.();
  };
  D.syncPreviewState = () => {
    D.stage.classList.toggle("inactive", S.inactive);
    D.stage.classList.toggle("without-selection", !D.hasSelection());
    document.querySelector(".workspace").dataset.readonly = String(S.condition === "readonly");
    document.querySelector("#append-row").disabled = S.condition === "readonly";
    document.querySelector("#custom-background").disabled = S.condition === "readonly";
  };
  D.setCondition = (value) => {
    D.closePopover?.(false); D.clearNativeRange();
    S.condition = value; S.inactive = value === "inactive"; S.sampleSelected = value !== "empty";
    if (D.isTable() && value !== "empty" && !S.anchor) { S.anchor = [0, 0]; S.head = [1, 3]; }
    if (value === "mixed") {
      D.remember?.();
      let targets = D.getTargets();
      if (targets.length === 1) {
        const node = targets[0], content = node.textContent, at = Math.ceil(content.length / 2);
        node.innerHTML = `<span ${D.isTable() ? "data-fragment" : "data-format"}>${D.escape(content.slice(0, at))}</span><span ${D.isTable() ? "data-fragment" : "data-format"}>${D.escape(content.slice(at))}</span>`;
        targets = D.getTargets();
      }
      targets.forEach((node, i) => { node.style.fontWeight = i % 2 === 0 ? "650" : "400"; });
    }
    document.querySelector("#selection-state").value = value;
    D.syncPreviewState(); D.update?.();
  };
  document.querySelector(".context-tabs").innerHTML = Object.entries(D.contexts).map(([key, [label, icon]]) =>
    `<button data-context="${key}" aria-pressed="${key === "grid"}">${D.icon(icon)}<span>${label}</span></button>`).join("");
  document.querySelector(".context-tabs").addEventListener("click", event => {
    const key = event.target.closest("[data-context]")?.dataset.context;
    if (key) D.setContext(key);
  });
  document.querySelector("#selection-state").addEventListener("change", event => D.setCondition(event.target.value));
  D.stage.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button,input,video,audio")) return;
    const block = event.target.closest("[data-block]"); if (!block) return;
    D.clearNativeRange(); D.nativeTarget = null; D.closePopover?.(false);
    const blocks = [...D.stage.querySelectorAll("[data-block]")], index = blocks.indexOf(block);
    const start = event.shiftKey ? (D.blockAnchor ?? index) : index;
    if (!event.shiftKey) D.blockAnchor = index;
    blocks.forEach((node, i) => node.classList.toggle("is-block-selected", i >= Math.min(start, index) && i <= Math.max(start, index)));
    S.sampleSelected = true; if (S.condition === "empty") S.condition = "normal";
    S.inactive = false; D.syncPreviewState(); D.updateToolbar?.();
  });
  D.stage.addEventListener("click", event => { if (event.target.closest("[data-link]")) event.preventDefault(); });
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed || D.popoverOpen) return;
    const range = selection.getRangeAt(0), container = D.isTable() ? D.table : D.stage;
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return;
    if (D.isTable() && S.context !== "cell") return;
    D.savedRange = range.cloneRange(); D.nativeTarget = null;
    S.sampleSelected = true; D.updateToolbar?.();
  });
  D.stage.addEventListener("keydown", event => {
    if (event.key === "Enter" && event.target.matches("[data-block]")) {
      S.sampleSelected = true; S.condition = "normal"; D.syncPreviewState(); D.updateToolbar?.();
    }
  });
  document.querySelector("#close-preview").addEventListener("click", () => document.querySelector("#preview-dialog").close());
})();
