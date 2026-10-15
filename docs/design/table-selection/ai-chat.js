(() => {
  const D = window.TableDesign, A = D.ai;
  const toggle = document.querySelector("#chat-toggle");
  const workspace = document.querySelector(".workspace");
  const fitPanel = () => {
    if (A.panel.hidden) return;
    const viewport = window.visualViewport?.height || innerHeight;
    const available = innerWidth <= 760 ? viewport - 24 : viewport - Math.max(16, A.panel.getBoundingClientRect().top) - 16;
    A.panel.style.height = `${Math.min(720, Math.max(320, available))}px`;
  };
  A.resizeInput = () => {
    A.input.style.height = "auto";
    A.input.style.height = `${Math.min(120, Math.max(56, A.input.scrollHeight))}px`;
  };
  A.open = () => {
    if (A.panel.hidden) A.returnFocus = document.activeElement;
    D.closePopover(false); D.hideTooltip();
    A.panel.hidden = false; workspace.dataset.chatOpen = "true";
    toggle.setAttribute("aria-expanded", "true");
    fitPanel(); A.renderDraft();
    A.input.focus({ preventScroll: true });
    if (innerWidth <= 760) A.panel.scrollIntoView({ block: "start" });
    D.fitToolbar();
  };
  A.close = () => {
    A.closeMenu(false);
    A.panel.hidden = true; workspace.dataset.chatOpen = "false";
    toggle.setAttribute("aria-expanded", "false");
    D.hideTooltip();
    const focus = A.returnFocus;
    (focus?.isConnected && !focus.closest("[hidden]") ? focus : toggle).focus({ preventScroll: true });
    D.fitToolbar();
  };
  A.addSelection = () => {
    const quote = A.capture();
    if (!quote) return D.toast("请先选择有文字的内容");
    const duplicate = A.quotes.some(item => item.pageId === quote.pageId && item.textHash === quote.textHash && item.text === quote.text);
    if (!duplicate) A.quotes.push(quote);
    A.showError(""); A.renderDraft(); A.open();
    const message = duplicate ? "该选区已在输入框中" : "已加入选区引用";
    D.toast(message); A.announce(message);
  };
  const send = () => {
    if (A.job) return;
    const prompt = A.input.value.trim();
    const quotes = A.quotes.length ? A.quotes.slice() : A.turns.at(-1)?.quotes.slice() || [A.capture(true)].filter(Boolean);
    if (!prompt || !quotes.length) { A.showError(!quotes.length ? "当前内容为空，请先添加引用。" : "请输入指令。"); return; }
    const turn = { id: A.id("turn"), quotes, prompt, result: "", destination: 0, status: "pending", applied: null };
    A.turns.push(turn); A.quotes = []; A.input.value = "";
    A.closeMenu(false); A.showError(""); A.renderDraft(); A.startReply(turn);
  };
  A.reset = () => {
    if (A.job) clearTimeout(A.job.timer);
    A.job = null; A.epoch++; A.quotes = []; A.turns = []; A.sessions = [];
    A.input.value = ""; A.simulateFailure = false; A.showError("");
    A.renderDraft(); A.renderMessages(); A.close();
  };
  toggle.addEventListener("click", () => A.panel.hidden ? A.open() : A.close());
  A.panel.querySelector("#ai-close").addEventListener("click", A.close);
  A.panel.querySelector("#ai-add").addEventListener("click", A.addSelection);
  A.panel.querySelector("#ai-stop").addEventListener("click", () => { A.stopReply(); A.input.focus(); });
  A.panel.querySelector("#ai-composer").addEventListener("submit", event => { event.preventDefault(); send(); });
  A.input.addEventListener("input", () => { A.showError(""); A.resizeInput(); A.refreshControls(); });
  A.input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault(); send();
    }
  });
  A.panel.addEventListener("keydown", event => {
    if (event.key === "Escape" && !event.isComposing) {
      event.preventDefault(); event.stopPropagation();
      if (!A.menu.hidden) A.closeMenu(); else A.close();
    }
  });
  A.panel.addEventListener("pointerdown", event => {
    if (event.target.closest("#ai-add")) event.preventDefault();
  });
  A.panel.addEventListener("input", event => {
    if (!event.target.matches("[data-result]")) return;
    const turn = A.turns.find(item => item.id === event.target.closest("[data-turn]").dataset.turn);
    turn.result = event.target.value; turn.notice = "";
    A.resizeReply(event.target);
    const notice = event.target.closest("[data-turn]").querySelector(".ai-write-notice");
    notice.hidden = true; A.refreshControls();
  });
  A.panel.addEventListener("change", event => {
    if (!event.target.matches("[data-destination]")) return;
    const turn = A.turns.find(item => item.id === event.target.closest("[data-turn]").dataset.turn);
    turn.destination = Number(event.target.value); A.renderMessages();
  });
  A.panel.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.prompt) {
      A.input.value = button.dataset.prompt; A.showError(""); A.resizeInput(); A.refreshControls(); A.input.focus(); return;
    }
    if (button.dataset.removeQuote) {
      A.quotes = A.quotes.filter(item => item.id !== button.dataset.removeQuote);
      A.renderDraft(); A.input.focus(); A.announce("已移除引用"); return;
    }
    if (button.id === "ai-note-source" || button.dataset.source) {
      const quote = button.dataset.source
        ? [...A.quotes, ...A.turns.flatMap(turn => turn.quotes)].find(item => item.id === button.dataset.source) : A.capture(true);
      if (quote) A.showQuote(quote, button);
      return;
    }
    const action = button.dataset.chatAction;
    if (!action) return;
    const turn = A.turns.find(item => item.id === button.closest("[data-turn]").dataset.turn);
    if (!turn) return;
    if (["insert", "replace"].includes(action)) {
      try { A.apply(turn, action); }
      catch (error) { turn.notice = error.message; A.renderMessages(); }
    } else if (action === "copy") D.copyText(turn.result);
    else if (action === "retry") A.startReply(turn);
    else if (action === "revise") {
      if (A.input.value.trim() || A.quotes.length) return A.showError("输入框已有草稿，请先发送或清空后再调整这一轮。");
      A.quotes = turn.quotes.slice(); A.input.value = turn.prompt;
      A.showError(""); A.renderDraft(); A.input.focus();
    } else if (action === "undo") {
      if (D.history.at(-1)?.aiTurnId !== turn.id || D.state.condition === "readonly") return D.toast(button.title);
      D.undo();
    }
  });
  const widthPicker = document.querySelector("#ai-panel-width");
  const previewWidth = new URLSearchParams(location.search).get("width");
  if (["280", "320", "338", "400"].includes(previewWidth)) widthPicker.value = previewWidth;
  workspace.style.setProperty("--ai-panel-width", `${widthPicker.value}px`);
  widthPicker.addEventListener("change", () => {
    workspace.style.setProperty("--ai-panel-width", `${widthPicker.value}px`);
    A.open();
  });
  window.addEventListener("resize", () => { A.closeMenu(false); fitPanel(); });
  let scrollFrame = null;
  window.addEventListener("scroll", () => {
    if (scrollFrame !== null) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = null; fitPanel(); });
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", fitPanel);
  A.renderDraft(); A.renderMessages();
})();
