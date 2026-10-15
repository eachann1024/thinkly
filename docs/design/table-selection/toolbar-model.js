(() => {
  const D = window.TableDesign, S = D.state;
  const action = (label, icon, group, priority, options = {}) => ({ label, icon, group, priority, ...options });
  D.actions = {
    type: action("块类型", "TextH", 0, 100, { menu: "type", text: true, mutate: true }),
    bold: action("加粗", "TextB", 1, 95, { toggle: true, mutate: true, shortcut: "⌘ B" }),
    italic: action("斜体", "TextItalic", 1, 80, { toggle: true, mutate: true, shortcut: "⌘ I" }),
    underline: action("下划线", "TextUnderline", 1, 55, { toggle: true, mutate: true, shortcut: "⌘ U" }),
    strike: action("删除线", "TextStrikethrough", 1, 0, { toggle: true, mutate: true }),
    inline: action("行内代码", "Code", 1, 0, { toggle: true, mutate: true }),
    color: action("文字与背景颜色", "Palette", 1, 75, { menu: "color", mutate: true }),
    link: action("添加链接", "Link", 1, 60, { menu: "link", mutate: true, shortcut: "⌘ K" }),
    align: action("对齐方式", "TextAlignLeft", 2, 85, { menu: "align", mutate: true }),
    left: action("左对齐", "TextAlignLeft", 2, 85, { toggle: true, mutate: true }),
    center: action("居中对齐", "TextAlignCenter", 2, 70, { toggle: true, mutate: true }),
    right: action("右对齐", "TextAlignRight", 2, 50, { toggle: true, mutate: true }),
    outdent: action("减少缩进", "TextIndent", 2, 35, { mutate: true }),
    indent: action("增加缩进", "TextIndent", 2, 40, { mutate: true }),
    ai: action("加入对话", "Sparkle", 3, 45, { menu: "ai" }),
    copy: action("复制选中内容", "Copy", 3, 100, { shortcut: "⌘ C" }),
    clear: action("清除格式", "Eraser", 4, 10, { mutate: true }),
    undo: action("撤销上次操作", "ArrowCounterClockwise", 4, 0, { mutate: true }),
    edit: action("编辑内容", "Note", 4, 0, { mutate: true }),
    zoom: action("放大预览", "ArrowsOut", 2, 90),
    alt: action("图片说明", "Note", 3, 55, { menu: "alt", mutate: true }),
    download: action("下载文件", "DownloadSimple", 3, 100),
    language: action("代码语言", "Code", 0, 100, { menu: "language", text: true, mutate: true }),
    wrap: action("自动换行", "TextIndent", 1, 90, { toggle: true }),
    format: action("格式化 JSON", "MagicWand", 1, 85, { mutate: true }),
    open: action("打开链接", "ArrowSquareOut", 1, 95),
    editLink: action("编辑链接", "Note", 2, 90, { menu: "link", text: true, mutate: true }),
    unlink: action("移除链接", "Eraser", 2, 65, { mutate: true }),
    rename: action("重命名", "Note", 2, 60, { menu: "rename", mutate: true }),
    cancel: action("取消选区", "X", 5, 0, { shortcut: "Esc" }),
  };
  const marks = ["bold", "italic", "underline", "strike", "inline", "color"];
  D.contextActions = {
    text: ["type", ...marks, "link", "align", "ai", "copy", "clear", "undo", "cancel"],
    heading: ["type", "color", "align", "ai", "copy", "clear", "undo", "cancel"],
    list: ["type", ...marks, "link", "outdent", "indent", "ai", "copy", "clear", "undo", "cancel"],
    quote: ["type", ...marks, "link", "align", "ai", "copy", "clear", "undo", "cancel"],
    grid: ["bold", "italic", "underline", "color", "left", "center", "right", "ai", "copy", "edit", "clear", "undo", "cancel"],
    cell: [...marks, "link", "align", "ai", "copy", "edit", "clear", "undo", "cancel"],
    image: ["left", "center", "right", "zoom", "alt", "copy", "download", "undo", "cancel"],
    code: ["language", "wrap", "format", "copy", "download", "edit", "undo", "cancel"],
    link: ["open", "editLink", "unlink", "copy", "undo", "cancel"],
    file: ["zoom", "rename", "copy", "download", "undo", "cancel"],
    mixed: ["left", "center", "right", "copy", "undo", "cancel"],
  };
  D.history = [];
  D.copyStatus = "idle";
  D.currentLanguage = () => D.stage.querySelector("[data-code-language]")?.textContent || "JSON";
  D.actionState = (key) => {
    const targets = D.formatTargets(), alignTargets = D.getAlignTargets();
    const match = {
      bold: node => Number(getComputedStyle(node).fontWeight) >= 600,
      italic: node => getComputedStyle(node).fontStyle === "italic",
      underline: node => getComputedStyle(node).textDecorationLine.includes("underline"),
      strike: node => getComputedStyle(node).textDecorationLine.includes("line-through"),
      inline: node => node.dataset.inline === "true",
    }[key];
    const matches = match ? targets.map(match) : ["left", "center", "right"].includes(key)
      ? alignTargets.map(node => (node.dataset.align || node.style.textAlign || "left") === key) : [];
    if (key === "wrap") return String(D.stage.querySelector("pre")?.dataset.wrap === "true");
    if (!matches.length) return "false";
    return matches.every(Boolean) ? "true" : matches.some(Boolean) ? "mixed" : "false";
  };
  D.disabledReason = (key) => {
    if (D.actions[key].mutate && S.condition === "readonly") return "只读内容，无法修改";
    if (key === "undo" && !D.history.length) return "还没有可撤销的操作";
    if (key === "format" && D.currentLanguage() !== "JSON") return "原型仅支持 JSON 格式化";
    if (key === "edit" && D.isTable() && D.cells().length !== 1) return "请先选择一个单元格";
    if (key === "outdent" && !Number(D.selectedBlocks()[0]?.dataset.indent)) return "已在最外层";
    if (key === "indent" && Number(D.selectedBlocks()[0]?.dataset.indent) >= 3) return "已达到三级缩进";
    if (key === "copy" && (D.copyStatus === "busy" || S.condition === "busy")) return "正在复制";
    return "";
  };
  D.contextLabel = () => {
    const kind = D.activeContext();
    if (kind === "grid" && D.bounds()) {
      const b = D.bounds(); return `${b.bottom - b.top + 1} 行 × ${b.right - b.left + 1} 列`;
    }
    if (kind === "mixed") return `${D.selectedBlocks().length} 个块`;
    return D.contexts[kind]?.[0] || "选区";
  };
  D.actionLabel = (key) => {
    if (key === "type") {
      const heading = D.stage.querySelector("[data-heading]")?.dataset.heading;
      return D.activeContext() === "heading" ? `标题 ${heading || 2}` : D.contextLabel();
    }
    if (key === "language") return D.currentLanguage();
    if (key === "ai") return "加入对话";
    if (key === "editLink") return "编辑";
    if (key !== "copy") return D.actions[key].label;
    if (S.condition === "error" || D.copyStatus === "error") return "重试复制";
    if (S.condition === "busy" || D.copyStatus === "busy") return "复制中";
    if (D.copyStatus === "success") return "已复制";
    return { image: "复制 SVG", file: "复制文件名", link: "复制链接" }[D.activeContext()] || "复制";
  };
  D.selectionText = () => {
    if (D.savedRange?.startContainer.isConnected) return D.savedRange.toString();
    const kind = D.activeContext();
    if (D.isTable()) {
      const b = D.bounds(); if (!b) return "";
      return D.rows.slice(b.top, b.bottom + 1).map(row => row.slice(b.left, b.right + 1).join("\t")).join("\n");
    }
    if (kind === "image") return D.selectedBlocks()[0]?.querySelector("svg")?.outerHTML || "";
    if (kind === "code") return D.stage.querySelector("code").textContent;
    if (kind === "link") return D.stage.querySelector("[data-link]")?.getAttribute("href") || "";
    if (kind === "file") return D.stage.querySelector("[data-filename]")?.textContent || "";
    return D.selectedBlocks().map(node => node.textContent.trim()).join("\n");
  };
  document.querySelector("#toolbar-plan").innerHTML = `
    <div class="finding"><strong>统一组件</strong><p>文字、图片、链接与代码当前分开渲染，控件尺寸与定位规则各有差异。</p><p>同一外壳 + 选区能力 + 动作配置。桌面 46px 高 / 32px 控件 / 18px 图标；触屏统一扩大命中区。</p></div>
    <div class="finding"><strong>显示有效操作</strong><p>多格不等于格内文字，图片不需要文字加粗，混合块也不应批量套用不适用的格式。</p><p>按选区切换操作；跨类型仅显示共同能力。标题遵循现有编辑器策略，隐藏字符加粗、斜体等操作。</p></div>
    <div class="finding"><strong>状态与焦点</strong><p>格式不一致不能显示为全部未选；弹出菜单也不应清掉选区。</p><p>混合态使用短横标记；只读保留复制和预览。保存文字范围，Esc 先关菜单再清选区；Alt + F10 进入工具栏。</p></div>
    <div class="finding"><strong>小窗与错误</strong><p>直接隐藏按钮会丢失功能，复制请求也可能失败或重复触发。</p><p>按可用宽度收纳到“更多”；菜单避让窗口边缘。复制提供进行中、成功、失败重试，本页修改支持撤销。</p></div>`;
})();
