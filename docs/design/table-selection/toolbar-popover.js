(() => {
  const D = window.TableDesign;
  const popover = document.querySelector("#toolbar-popover");
  D.popover = popover; D.popoverOpen = null;
  const row = (key, label, icon, checked = false) => `<button role="menuitemradio" aria-checked="${checked}" data-choice="${key}">${D.icon(icon)}<span class="menu-label">${label}</span>${checked ? D.icon("Check") : ""}</button>`;
  const formEnd = (label = "保存") => `<p class="field-error" role="alert" hidden></p><div class="popover-actions"><button type="button" data-dismiss>取消</button><button type="submit" class="primary">${label}</button></div></form>`;
  const input = (label, name, value, type = "text") => `<label>${label}<input name="${name}" type="${type}" value="${D.escape(value || "")}" required autocomplete="off"></label>`;
  D.menuMarkup = (name) => {
    const kind = D.activeContext();
    if (name === "more") return `<div class="popover-heading">更多操作</div><div role="menu" aria-label="更多操作">${(D.overflowActions || []).map(key => D.actionButton(key, true)).join("")}</div>`;
    if (name === "align") return `<div role="menu" aria-label="对齐方式">${["left", "center", "right"].map(key => D.actionButton(key, true)).join("")}</div>`;
    if (name === "type") return `<div class="popover-heading">转换为</div><div role="menu" aria-label="块类型">${[
      ["text", "正文", "Note"], ["heading:2", "标题 2", "TextH"], ["heading:3", "标题 3", "TextH"],
      ["list", "无序列表", "ListBullets"], ["numbered", "有序列表", "ListNumbers"], ["quote", "引用", "Quotes"],
    ].map(([key, label, icon]) => row(key, label, icon, key === kind || (key === `heading:${D.stage.querySelector("[data-heading]")?.dataset.heading}`))).join("")}</div>`;
    if (name === "language") return `<div class="popover-heading">代码语言</div><div role="menu" aria-label="代码语言">${["JSON", "JavaScript", "Plain Text"].map(label => row(label, label, "Code", label === D.currentLanguage())).join("")}</div>`;
    if (name === "color") {
      const colors = [["default", "默认"], ["pine", "松绿"], ["rose", "玫瑰"], ["ocean", "海洋"], ["coral", "珊瑚"]];
      return `<div role="dialog" aria-label="文字与背景颜色"><div class="popover-heading">文字颜色</div><div class="color-options">${colors.map(([key, label]) => `<button data-color="${key}" aria-label="${label}文字" style="--chip-color:var(--tone-${key},var(--ink))"><span class="color-letter">A</span></button>`).join("")}</div>
        <div class="popover-heading">背景颜色</div><div class="color-options">${colors.map(([key, label]) => `<button data-highlight="${key}" aria-label="${key === "default" ? "清除背景" : label + "背景"}" style="--chip-color:var(--tone-${key},var(--ink))"><span class="color-fill">${key === "default" ? "/" : "A"}</span></button>`).join("")}</div></div>`;
    }
    if (name === "link") {
      const link = D.stage.querySelector("[data-link]") || D.savedRange?.startContainer.parentElement?.closest("a");
      const selected = D.savedRange?.toString() || D.getTargets()[0]?.textContent || "";
      return `<form data-form="link" aria-label="编辑链接">${input("显示文字", "label", link?.textContent.trim() || selected)}${input("链接地址", "url", link?.getAttribute("href") || "", "text")}${formEnd(link ? "保存链接" : "添加链接")}`;
    }
    if (name === "alt") return `<form data-form="alt" aria-label="图片说明">${input("图片说明", "value", D.selectedBlocks()[0]?.querySelector("svg")?.getAttribute("aria-label") || "湖畔山色")}${formEnd()}`;
    if (name === "rename") return `<form data-form="rename" aria-label="文件名称">${input("文件名称", "value", D.stage.querySelector("[data-filename]").textContent)}${formEnd()}`;
    if (name === "editCode") return `<form data-form="editCode" aria-label="编辑代码"><label>编辑代码<textarea name="value" rows="7" spellcheck="false">${D.escape(D.stage.querySelector("code").textContent)}</textarea></label>${formEnd()}`;
    if (name === "ai") return `<form data-form="ai" aria-label="加入对话"><div class="popover-heading">加入对话<span class="connection-state">未连接 AI</span></div><blockquote class="selection-excerpt">${D.escape(D.selectionText().slice(0, 280))}</blockquote><label>指令<textarea name="prompt" rows="2" placeholder="例如：整理成一份检查清单"></textarea></label><p class="ai-boundary">原型可复制选区和指令，不会发送或生成内容。</p>${formEnd("复制到对话")}`;
    return "";
  };
  D.positionPopover = () => {
    if (!D.popoverOpen) return;
    const trigger = D.bar.querySelector(D.returnAction === "more" ? "[data-more]" : `[data-tool="${D.returnAction}"]`);
    const rect = (trigger?.hidden ? D.bar : trigger || D.bar).getBoundingClientRect();
    const margin = 10, viewport = window.visualViewport;
    const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    const top = viewport?.offsetTop || 0;
    popover.style.maxHeight = `${Math.max(120, height - margin * 2)}px`;
    const box = popover.getBoundingClientRect();
    const below = top + height - rect.bottom - margin;
    const above = rect.top - top - margin;
    const placeAbove = below < box.height + 8 && above > below;
    popover.dataset.side = placeAbove ? "top" : "bottom";
    popover.style.left = `${Math.max(margin, Math.min(width - box.width - margin, rect.left))}px`;
    popover.style.top = `${Math.max(top + margin, Math.min(top + height - box.height - margin, placeAbove ? rect.top - box.height - 8 : rect.bottom + 8))}px`;
  };
  D.openPopover = (name, trigger, nested = false) => {
    if (D.popoverOpen === name && !nested) return D.closePopover(true);
    D.hideTooltip();
    D.returnAction = trigger?.dataset.tool || "more";
    D.popoverOpen = name;
    popover.dataset.kind = name;
    popover.innerHTML = `${nested ? `<button class="popover-back" data-back>${D.icon("CaretRight")}更多操作</button>` : ""}${D.menuMarkup(name)}`;
    popover.hidden = false;
    D.bar.querySelectorAll("[aria-expanded]").forEach(button => button.setAttribute("aria-expanded", String(button === trigger)));
    D.positionPopover();
    (popover.querySelector("input, textarea") || popover.querySelector('[role^="menuitem"]') || popover.querySelector("button"))?.focus({ preventScroll: true });
  };
  D.closePopover = (returnFocus = false) => {
    if (!D.popoverOpen) return;
    const key = D.returnAction;
    D.popoverOpen = null; popover.hidden = true; popover.innerHTML = "";
    D.bar.querySelectorAll("[aria-expanded]").forEach(button => button.setAttribute("aria-expanded", "false"));
    if (returnFocus) {
      const button = D.bar.querySelector(key === "more" ? "[data-more]" : `[data-tool="${key}"]`);
      (button && !button.hidden ? button : D.bar.querySelector("[data-more]"))?.focus({ preventScroll: true });
    }
  };
  popover.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    if (button.matches("[data-dismiss]")) return D.closePopover(true);
    if (button.matches("[data-back]")) return D.openPopover("more", D.bar.querySelector("[data-more]"), true);
    if (button.dataset.tool) {
      const key = button.dataset.tool;
      if (D.disabledReason(key)) return D.toast(D.disabledReason(key));
      if (D.actions[key].menu) D.openPopover(D.actions[key].menu, D.bar.querySelector("[data-more]"), true);
      else { D.closePopover(true); D.runAction(key); }
    } else if (button.dataset.choice) {
      const name = D.popoverOpen, choice = button.dataset.choice;
      D.closePopover(true); D.applyChoice(name, choice);
    } else if (button.dataset.color || button.dataset.highlight) {
      const name = button.dataset.color ? "color" : "backgroundColor", value = button.dataset.color || button.dataset.highlight;
      D.closePopover(true); D.applyColor(name, value);
    }
  });
  popover.addEventListener("submit", event => { event.preventDefault(); D.submitPopover(event.target); });
  popover.addEventListener("keydown", event => {
    if (event.target.matches("input,textarea")) return;
    const nodes = [...popover.querySelectorAll('[role^="menuitem"], .color-options button')];
    const index = nodes.indexOf(document.activeElement);
    const move = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (nodes.length && (move || ["Home", "End"].includes(event.key))) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? nodes.length - 1 : (index + move + nodes.length) % nodes.length;
      nodes[next].focus();
    }
  });
  document.addEventListener("keydown", event => {
    if (!D.popoverOpen) return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopImmediatePropagation(); D.closePopover(true);
    } else if (event.key === "Tab") {
      const nodes = [...popover.querySelectorAll("input,textarea,button")];
      const atEdge = event.shiftKey ? document.activeElement === nodes[0] : document.activeElement === nodes.at(-1);
      if (atEdge) D.closePopover(true);
    }
  }, true);
  document.addEventListener("pointerdown", event => {
    if (D.popoverOpen && !popover.contains(event.target) && !D.bar.contains(event.target)) D.closePopover(false);
  });
  window.addEventListener("scroll", () => { D.hideTooltip(); D.positionPopover(); }, true);
  window.addEventListener("resize", D.positionPopover);
  window.visualViewport?.addEventListener("resize", D.positionPopover);
})();
