(() => {
  const D = window.TableDesign, A = D.ai, escape = D.escape;
  const menu = A.menu = A.panel.querySelector("#ai-menu");
  A.sessions = [];
  A.model = "deepseek-flash";
  const item = (action, label, icon = "", extra = "") => `<button type="button" class="ai-menu-item" data-menu-action="${action}" ${extra}>${icon ? D.icon(icon) : ""}<span>${label}</span></button>`;
  A.closeMenu = (restoreFocus = true) => {
    menu.hidden = true;
    A.menuAnchor?.setAttribute("aria-expanded", "false");
    if (restoreFocus && A.menuAnchor?.isConnected) A.menuAnchor.focus({ preventScroll: true });
    A.menuAnchor = null;
  };
  const show = (kind, anchor, markup, title) => {
    if (!menu.hidden && A.menuKind === kind && A.menuAnchor === anchor) { A.closeMenu(); return; }
    A.closeMenu(false);
    menu.innerHTML = markup; menu.hidden = false;
    menu.setAttribute("role", "dialog"); menu.setAttribute("aria-label", title);
    A.menuKind = kind; A.menuAnchor = anchor;
    anchor.setAttribute("aria-expanded", "true");
    const panelRect = A.panel.getBoundingClientRect(), anchorRect = anchor.getBoundingClientRect();
    const below = anchorRect.bottom - panelRect.top + 6;
    const above = anchorRect.top - panelRect.top - menu.offsetHeight - 6;
    menu.style.top = `${Math.max(44, Math.min(below + menu.offsetHeight <= panelRect.height - 8 ? below : above, panelRect.height - menu.offsetHeight - 8))}px`;
    menu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  };
  A.showQuote = (quote, anchor) => {
    A.menuQuote = quote;
    show(`quote-${quote.id}`, anchor, `<div class="ai-menu-title">${escape(quote.title)} · ${escape(quote.label)}</div><pre class="ai-quote-preview" tabindex="0">${escape(quote.text)}</pre>${item("locate", "定位原文", "Quotes")}`, "引用内容");
  };
  const archive = () => {
    if (!A.turns.length && !A.quotes.length && !A.input.value.trim()) return;
    A.sessions.unshift({ id: A.id("session"), turns: A.turns, quotes: A.quotes, draft: A.input.value, model: A.model });
  };
  const refreshSession = () => {
    A.panel.querySelector("#ai-model-picker span").textContent = A.model;
    A.panel.querySelector("#ai-model-picker").title = `选择模型 · 当前 ${A.model}`;
    A.showError(""); A.renderDraft(); A.renderMessages(true); A.closeMenu(false); A.input.focus();
  };
  A.panel.querySelector("#ai-new").addEventListener("click", () => {
    if (A.job) return D.toast("请先停止当前回复，再新建会话");
    archive(); A.quotes = []; A.turns = []; A.input.value = "";
    refreshSession(); A.announce("已新建会话，原会话可从历史中找回");
  });
  A.panel.querySelector("#ai-history").addEventListener("click", event => {
    const markup = A.sessions.length ? A.sessions.map(session => {
      const title = session.turns[0]?.prompt || session.draft || "未发送的引用";
      return item("session", escape(title), "ClockCounterClockwise", `data-session="${session.id}" ${A.job ? "disabled" : ""}`);
    }).join("") : '<div class="ai-menu-empty">还没有历史会话</div>';
    show("history", event.currentTarget, `<div class="ai-menu-title">本页会话</div>${markup}`, "历史会话");
  });
  A.panel.querySelector("#ai-model-picker").addEventListener("click", event => {
    show("model", event.currentTarget, `<div class="ai-menu-title">模型 · 外观预览</div>${["deepseek-flash", "deepseek-v4-pro"].map(name => item("model", `${escape(name)}${A.model === name ? `<span class="ai-menu-check">${D.icon("Check")}</span>` : ""}`, "", `data-model="${name}"`)).join("")}`, "选择模型");
  });
  A.panel.querySelector("#ai-more").addEventListener("click", event => {
    show("more", event.currentTarget, `<div class="ai-menu-title">预览选项</div>${item("copy-chat", "复制当前对话", "Copy", A.turns.length ? "" : "disabled")}<div class="ai-menu-separator"></div>${item("failure", `下次模拟失败${A.simulateFailure ? `<span class="ai-menu-check">${D.icon("Check")}</span>` : ""}`, "", A.job ? "disabled" : "")}`, "更多面板选项");
  });
  menu.addEventListener("click", event => {
    const button = event.target.closest("[data-menu-action]");
    if (!button) return;
    const action = button.dataset.menuAction;
    if (action === "locate") { A.locate(A.menuQuote); A.closeMenu(); }
    if (action === "failure") { A.simulateFailure = !A.simulateFailure; D.toast(A.simulateFailure ? "下一次回复将模拟失败" : "已恢复正常回复"); A.closeMenu(); }
    if (action === "copy-chat") {
      D.copyText(A.turns.map(turn => `我：${turn.prompt}\n\nAI 助手：${turn.result || turn.error || "已停止"}`).join("\n\n"));
      A.closeMenu();
    }
    if (action === "model") { A.model = button.dataset.model; refreshSession(); }
    if (action === "session" && !A.job) {
      const index = A.sessions.findIndex(session => session.id === button.dataset.session);
      if (index < 0) return;
      const [session] = A.sessions.splice(index, 1);
      archive(); A.turns = session.turns; A.quotes = session.quotes; A.input.value = session.draft; A.model = session.model;
      refreshSession();
    }
  });
  menu.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || event.target.matches("pre")) return;
    event.preventDefault();
    const buttons = [...menu.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  });
  document.addEventListener("pointerdown", event => {
    if (!menu.hidden && !menu.contains(event.target) && !A.menuAnchor?.contains(event.target)) A.closeMenu(false);
  });
  for (const id of ["ai-history", "ai-more", "ai-model-picker"]) {
    const button = A.panel.querySelector(`#${id}`);
    button.setAttribute("aria-haspopup", "dialog"); button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "ai-menu");
  }
})();
