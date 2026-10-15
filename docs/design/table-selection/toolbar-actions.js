(() => {
  const D = window.TableDesign, S = D.state;
  D.remember = () => {
    D.history.push({
      context: S.context, anchor: S.anchor?.slice(), head: S.head?.slice(), custom: S.custom,
      rows: structuredClone(D.rows), body: D.table.querySelector("tbody").innerHTML,
      gutter: D.wrap.querySelector(".row-gutter").innerHTML, stage: D.stage.innerHTML,
      cache: { ...D.sampleCache }, file: D.fileAsset,
    });
    if (D.history.length > 30) D.history.shift();
  };
  D.undo = () => {
    const previous = D.history.pop(); if (!previous) return;
    D.setContext(previous.context); D.sampleCache = previous.cache;
    D.stage.innerHTML = previous.stage; D.rows = previous.rows; D.fileAsset = previous.file;
    D.table.querySelector("tbody").innerHTML = previous.body;
    D.wrap.querySelector(".row-gutter").innerHTML = previous.gutter;
    S.anchor = previous.anchor; S.head = previous.head; S.custom = previous.custom;
    D.clearNativeRange(); D.nativeTarget = null; D.update(); D.toast("已撤销上次操作");
  };
  D.copyText = async (text) => {
    if (D.copyStatus === "busy") return;
    const context = S.context, focused = document.activeElement;
    if (["busy", "error"].includes(S.condition)) {
      S.condition = "normal"; document.querySelector("#selection-state").value = "normal";
    }
    clearTimeout(D.copyTimer); D.copyStatus = "busy"; D.updateToolbar();
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; }
    } catch { copied = false; }
    if (!copied) {
      const field = document.createElement("textarea"); field.value = text;
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.append(field); field.select();
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      field.remove();
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      D.restoreRange();
    }
    D.copyStatus = S.context === context ? copied ? "success" : "error" : "idle";
    D.updateToolbar(); D.toast(copied ? "已复制" : "复制失败，请重试或使用系统复制");
    if (copied) D.copyTimer = setTimeout(() => { D.copyStatus = "idle"; D.updateToolbar(); }, 2000);
  };
  D.copy = () => { if (D.hasSelection()) return D.copyText(D.selectionText()); };
  D.applyColor = (property, value) => {
    if (S.condition === "readonly") return;
    D.remember(); D.materializeRange();
    D.formatTargets().forEach(node => {
      node.style[property] = value === "default" ? "" : property === "color" ? `var(--tone-${value})` : `var(--marker-${value})`;
    });
    D.restoreRange(); D.updateToolbar();
  };
  D.applyChoice = (menu, value) => {
    if (S.condition === "readonly") return;
    D.remember(); D.clearNativeRange(); D.nativeTarget = null;
    if (menu === "language") {
      D.stage.querySelector("[data-code-language]").textContent = value;
    } else if (menu === "type") {
      const node = D.selectedBlocks()[0]; if (!node) return;
      const lines = [...node.querySelectorAll("li")].map(item => item.textContent);
      const content = lines.length ? lines : [node.textContent.trim()];
      const mark = text => `<span data-format>${D.escape(text)}</span>`;
      if (value.startsWith("heading:")) {
        const level = value.split(":")[1]; node.dataset.block = "heading";
        node.innerHTML = `<h${level} data-heading="${level}">${mark(content.join(" · "))}</h${level}>`;
      } else {
        node.dataset.block = value === "numbered" ? "list" : value;
        const tag = value === "numbered" ? "ol" : "ul";
        node.innerHTML = value === "quote" ? `<blockquote><p>${mark(content.join("；"))}</p></blockquote>`
          : ["list", "numbered"].includes(value) ? `<${tag} class="sample-list">${content.map(item => `<li>${mark(item)}</li>`).join("")}</${tag}>`
            : `<p>${mark(content.join("；"))}</p>`;
      }
    }
    D.updateToolbar();
  };
  D.runAction = (key) => {
    if (!D.hasSelection() || D.disabledReason(key)) return;
    S.inactive = false;
    if (S.condition === "inactive") S.condition = "normal";
    const kind = D.activeContext();
    if (key === "copy") return D.copy();
    if (key === "undo") return D.undo();
    if (key === "cancel") return D.clearSelection();
    if (key === "download") return D.downloadSelection();
    if (key === "zoom") return D.previewSelection();
    if (key === "open") {
      const url = D.stage.querySelector("[data-link]")?.getAttribute("href");
      if (url && D.safeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (key === "edit") {
      if (D.isTable()) D.editCell(D.cells()[0]);
      else if (kind === "code") D.openPopover("editCode", D.bar.querySelector("[data-more]"));
      return;
    }
    if (key === "format") {
      const node = D.stage.querySelector("code");
      try {
        const result = JSON.stringify(JSON.parse(node.textContent), null, 2);
        D.remember(); node.textContent = result; D.toast("JSON 已格式化");
      } catch { D.toast("JSON 格式有误，请从更多菜单编辑后重试"); }
    } else if (key === "wrap") {
      const pre = D.stage.querySelector(".sample-code");
      pre.dataset.wrap = String(pre.dataset.wrap !== "true");
    } else {
      D.remember();
      if (["bold", "italic", "underline", "strike", "inline"].includes(key)) {
        D.materializeRange();
        const turnOff = D.actionState(key) === "true";
        D.formatTargets().forEach(node => {
          if (key === "bold") node.style.fontWeight = turnOff ? "400" : "650";
          if (key === "italic") node.style.fontStyle = turnOff ? "normal" : "italic";
          if (["underline", "strike"].includes(key)) {
            const decoration = key === "underline" ? "underline" : "line-through";
            const current = getComputedStyle(node).textDecorationLine.split(" ").filter(item => item !== "none" && item !== decoration);
            node.style.textDecorationLine = [...current, ...turnOff ? [] : [decoration]].join(" ") || "none";
          }
          if (key === "inline") node.dataset.inline = String(!turnOff);
        });
        D.restoreRange();
      } else if (["left", "center", "right"].includes(key)) {
        D.getAlignTargets().forEach(node => { node.style.textAlign = key; node.dataset.align = key; });
      } else if (key === "clear") {
        D.materializeRange();
        D.formatTargets().forEach(node => [node, ...node.querySelectorAll("[style], [data-inline]")].forEach(child => { child.removeAttribute("style"); delete child.dataset.inline; }));
        D.restoreRange();
      } else if (["indent", "outdent"].includes(key)) {
        D.selectedBlocks().forEach(node => {
          const value = Math.max(0, Math.min(3, Number(node.dataset.indent || 0) + (key === "indent" ? 1 : -1)));
          node.dataset.indent = String(value); node.style.paddingLeft = `${24 + value * 22}px`;
        });
      } else if (key === "unlink") {
        const link = D.stage.querySelector("[data-link]"), block = link?.closest("[data-block]");
        if (link) { const text = document.createElement("span"); text.dataset.format = ""; text.textContent = link.textContent; link.replaceWith(text); block.dataset.block = "text"; }
      }
    }
    document.querySelector("#selection-state").value = S.condition;
    D.update();
  };
  D.safeUrl = (value) => {
    try { const url = new URL(value); return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  D.submitPopover = (form) => {
    const data = new FormData(form), name = form.dataset.form;
    const error = (message) => { const node = form.querySelector(".field-error"); node.hidden = false; node.textContent = message; };
    if (name === "ai") {
      const text = [D.selectionText(), data.get("prompt")?.trim()].filter(Boolean).join("\n\n");
      D.closePopover(true); D.copyText(text); return;
    }
    if (S.condition === "readonly") return error("只读内容，无法修改");
    if (name === "link") {
      const url = D.safeUrl(String(data.get("url")).trim());
      if (!url) return error("请输入 http、https 或 mailto 地址");
      const label = String(data.get("label")).trim(); if (!label) return error("请输入显示文字");
      D.remember();
      let link = D.stage.querySelector("[data-link]") || D.savedRange?.startContainer.parentElement?.closest("a");
      if (!link) {
        D.materializeRange();
        const target = D.formatTargets()[0]; if (!target) return error("请先选中一段文字");
        link = document.createElement("a"); link.dataset.link = ""; link.className = "sample-link";
        target.replaceChildren(link);
      }
      link.href = url; link.textContent = label; link.target = "_blank"; link.rel = "noopener noreferrer";
      D.clearNativeRange();
    } else {
      const value = String(data.get("value") || "").trim();
      if (!value && name !== "editCode") return error("内容不能为空");
      D.remember();
      if (name === "alt") {
        const figure = D.selectedBlocks()[0].querySelector("figure");
        figure.querySelector("svg").setAttribute("aria-label", value);
        let caption = figure.querySelector("figcaption");
        if (!caption) { caption = document.createElement("figcaption"); figure.append(caption); }
        caption.textContent = value;
      } else if (name === "rename") {
        const filename = value.replace(/[\\/\u0000-\u001f]/g, "_");
        D.stage.querySelector("[data-filename]").textContent = filename;
        if (D.fileAsset) D.fileAsset = { ...D.fileAsset, name: filename };
      } else if (name === "editCode") D.stage.querySelector("code").textContent = String(data.get("value"));
    }
    D.closePopover(true); D.update();
  };
})();
