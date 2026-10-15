(() => {
  const D = window.TableDesign, A = D.ai, escape = D.escape;
  const panel = A.panel = document.querySelector("#ai-panel");
  panel.innerHTML = `
    <div class="ai-heading">
      <div class="ai-heading-title"><span id="ai-title">AI 助手</span></div>
      <div class="ai-heading-actions" role="toolbar" aria-label="AI 工具栏">
        <button type="button" class="ai-icon-button" id="ai-new" aria-label="新建会话" title="新建会话">${D.icon("Plus")}</button>
        <button type="button" class="ai-icon-button" id="ai-history" aria-label="历史会话" title="历史会话">${D.icon("ClockCounterClockwise")}</button>
        <button type="button" class="ai-icon-button" id="ai-more" aria-label="更多面板选项" title="更多面板选项">${D.icon("DotsThree")}</button>
        <button type="button" class="ai-icon-button" id="ai-close" aria-label="关闭 AI" title="关闭 AI">${D.icon("X")}</button>
      </div>
    </div>
    <div id="ai-messages" class="ai-messages" role="log" aria-label="对话记录" aria-live="off" tabindex="0"></div>
    <form id="ai-composer" class="ai-composer">
      <div class="ai-composer-shell bui-prompt-bar">
        <div id="ai-composer-chips" class="ai-composer-chips"></div>
        <label class="sr-only" for="ai-prompt">对话指令</label>
        <textarea id="ai-prompt" rows="2" maxlength="4000" placeholder="想对这篇笔记做些什么？" aria-describedby="ai-form-error"></textarea>
        <p class="field-error" id="ai-form-error" role="alert" hidden></p>
        <div class="ai-compose-dock">
          <button type="button" id="ai-add" class="ai-dock-btn" aria-label="添加当前选区" title="添加当前选区">${D.icon("Plus")}</button>
          <button type="button" class="ai-model-pill" id="ai-model-picker" aria-label="切换模型" title="选择模型"><span>deepseek-flash</span>${D.icon("CaretDown")}</button>
          <div class="ai-dock-spacer" aria-hidden="true"></div>
          <button type="button" id="ai-stop" class="ai-send-round ai-stop-btn" aria-label="停止生成" title="停止生成" hidden><span class="ai-stop-square"></span></button>
          <button type="submit" id="ai-send" class="ai-send-round" aria-label="发送消息" title="发送消息">${D.icon("ArrowUp")}</button>
        </div>
      </div>
    </form>
    <div class="ai-menu" id="ai-menu" hidden></div>
    <div class="sr-only" id="ai-live" role="status" aria-live="polite"></div>`;

  A.input = panel.querySelector("#ai-prompt");
  A.messages = panel.querySelector("#ai-messages");
  A.announce = message => { panel.querySelector("#ai-live").textContent = message; };
  A.showError = message => {
    const node = panel.querySelector("#ai-form-error");
    node.textContent = message; node.hidden = !message;
  };
  const quoteMarkup = (quote, removable = false) => `
    <div class="ai-chip ai-chip-quote">
      <button type="button" class="ai-chip-source" data-source="${quote.id}" title="${escape(quote.title)} · ${escape(quote.label)}，点击查看引用">
        <span class="ai-chip-quote-icon" aria-hidden="true">${D.icon("Quotes")}</span>
        <span class="ai-chip-text">${escape(quote.text.replace(/\s+/g, " ").trim())}</span>
      </button>
      ${removable ? `<button type="button" class="ai-chip-remove" data-remove-quote="${quote.id}" aria-label="移除引用：${escape(A.summary(quote.text))}">${D.icon("X")}</button>` : ""}
    </div>`;

  A.renderDraft = () => {
    const chipsNode = panel.querySelector("#ai-composer-chips");
    if (A.quotes.length) {
      chipsNode.innerHTML = A.quotes.map(quote => quoteMarkup(quote, true)).join("");
    } else {
      const previous = A.turns.at(-1);
      chipsNode.innerHTML = previous
        ? previous.quotes.map(quote => quoteMarkup(quote)).join("")
        : `<button type="button" class="ai-chip ai-chip-doc" id="ai-note-source" title="查看当前笔记引用">${D.icon("Quotes")}<span class="ai-chip-text">当前笔记 · ${escape(document.querySelector(".document h1").textContent)}</span></button>`;
    }
    A.input.placeholder = A.quotes.length ? "想对引用内容做些什么？" : A.turns.length ? "继续提问…" : "想对这篇笔记做些什么？";
    if (A.resizeInput) A.resizeInput();
    A.refreshControls();
  };

  const resultActions = turn => {
    if (turn.status !== "done") return "";
    if (turn.applied) return `<div class="ai-result-actions"><span class="ai-applied-tag">${D.icon("Check")}${turn.applied === "insert" ? "已插入下方" : turn.quotes[turn.destination || 0]?.scope === "note" ? "已替换原文" : "已替换选区"}</span>
      <button type="button" class="ai-act-btn" data-chat-action="undo">${D.icon("ArrowCounterClockwise")}撤销</button>
      <button type="button" class="ai-act-btn ai-icon-only" data-chat-action="copy" aria-label="复制回复" title="复制回复">${D.icon("Copy")}</button></div>`;
    return `${turn.quotes.length > 1 ? `<label class="ai-destination">写入位置<select data-destination aria-label="写入位置">${turn.quotes.map((quote, i) => `<option value="${i}" ${i === (turn.destination || 0) ? "selected" : ""}>${escape(quote.title)} · ${escape(quote.label)}</option>`).join("")}</select></label>` : ""}
      <div class="ai-result-actions">
        <button type="button" class="ai-act-btn ai-act-primary" data-chat-action="insert">${D.icon("Plus")}插入下方</button>
        <button type="button" class="ai-act-btn" data-chat-action="replace">${turn.quotes[turn.destination || 0]?.scope === "note" ? "替换原文" : "替换选区"}</button>
        <button type="button" class="ai-act-btn ai-icon-only" data-chat-action="copy" aria-label="复制回复" title="复制回复">${D.icon("Copy")}</button>
      </div>`;
  };

  A.resizeReply = node => {
    node.style.height = "0px";
    node.style.height = `${Math.max(68, node.scrollHeight + 2)}px`;
  };
  A.renderMessages = (scroll = false) => {
    const focused = A.messages.contains(document.activeElement) ? document.activeElement : null;
    const focusId = focused?.closest("[data-turn]")?.dataset.turn;
    const focusAction = focused?.dataset.chatAction;
    A.messages.innerHTML = A.turns.length ? A.turns.map(turn => `
      <section class="ai-turn" data-turn="${turn.id}" aria-label="对话轮次">
        <div class="ai-user">
          <div class="ai-user-quotes">${turn.quotes.map(quote => quoteMarkup(quote)).join("")}</div>
          <div class="ai-user-prompt">${escape(turn.prompt)}</div>
        </div>
        <div class="ai-assistant">
          <div class="ai-assistant-label">${D.icon("Sparkle")}<span>AI 助手</span>${turn.status === "pending" ? '<span class="ai-pending-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : ""}</div>
          ${turn.status === "failed" ? `<p class="ai-error" role="alert">${escape(turn.error)}</p>` : ""}
          ${turn.status === "stopped" ? '<p class="ai-stopped">已停止生成</p>' : ""}
          ${["pending", "done"].includes(turn.status) || turn.result ? `<label class="sr-only" for="result-${turn.id}">回复内容，可编辑</label><textarea id="result-${turn.id}" data-result rows="${Math.min(9, Math.max(3, turn.result.split("\n").length + 1))}" aria-label="回复内容，可编辑" ${turn.status !== "done" || turn.applied ? "readonly" : ""} spellcheck="false" placeholder="正在生成回复…">${escape(turn.result)}</textarea>` : ""}
          ${["failed", "stopped"].includes(turn.status) ? `<div class="ai-result-actions"><button type="button" class="ai-act-btn" data-chat-action="retry">${D.icon("ArrowClockwise")}重试</button><button type="button" class="ai-act-btn" data-chat-action="revise">调整指令</button>${turn.result ? '<button type="button" class="ai-act-btn" data-chat-action="copy">复制部分</button>' : ""}</div>` : ""}
          ${resultActions(turn)}
          <p class="ai-write-notice" role="status" ${turn.notice ? "" : "hidden"}>${escape(turn.notice || "")}</p>
        </div>
      </section>`).join("") : `
      <div class="ai-empty-state">
        <div class="ai-empty-mark" aria-hidden="true">${D.icon("Quotes")}</div>
        <div class="ai-empty-title">想怎么修改这篇笔记？</div>
        <div class="ai-empty-suggestions">
          <button type="button" class="ai-suggestion-chip" data-prompt="整理成清单">整理成清单</button>
          <button type="button" class="ai-suggestion-chip" data-prompt="统一空格">统一空格</button>
          <button type="button" class="ai-suggestion-chip" data-prompt="转为大写">转为大写</button>
        </div>
      </div>`;
    A.refreshControls();
    A.messages.querySelectorAll("[data-result]").forEach(A.resizeReply);
    if (focusId) {
      const current = A.messages.querySelector(`[data-turn="${focusId}"]`);
      (current?.querySelector(`[data-chat-action="${focusAction}"]`) || current?.querySelector("[data-result]") || A.input)?.focus({ preventScroll: true });
    }
    if (scroll) A.messages.scrollTop = A.messages.scrollHeight;
  };

  A.updateStream = turn => {
    const node = A.messages.querySelector(`[data-turn="${turn.id}"] [data-result]`);
    if (!node) return;
    const atBottom = A.messages.scrollHeight - A.messages.scrollTop - A.messages.clientHeight < 64;
    node.value = turn.result; A.resizeReply(node);
    if (atBottom) A.messages.scrollTop = A.messages.scrollHeight;
  };

  new ResizeObserver(() => A.messages.querySelectorAll("[data-result]").forEach(A.resizeReply)).observe(A.messages);
  A.refreshControls = () => {
    const noteChip = panel.querySelector(".ai-chip-doc .ai-chip-text");
    if (noteChip) noteChip.textContent = `当前笔记 · ${document.querySelector(".document h1").textContent}`;
    const isWorking = Boolean(A.job);
    const hasPrompt = Boolean(A.input.value.trim());
    const sendBtn = panel.querySelector("#ai-send");
    const stopBtn = panel.querySelector("#ai-stop");
    sendBtn.hidden = isWorking;
    stopBtn.hidden = !isWorking;
    panel.querySelector("#ai-new").disabled = isWorking;
    panel.querySelector("#ai-model-picker").disabled = isWorking;
    const ready = hasPrompt;
    sendBtn.dataset.ready = ready ? "true" : "false";
    sendBtn.disabled = !ready;
    panel.querySelector("#ai-add").disabled = !D.hasSelection() || !(D.contextActions[D.activeContext()] || []).includes("ai");
    for (const turn of A.turns) {
      const section = A.messages.querySelector(`[data-turn="${turn.id}"]`);
      if (!section) continue;
      for (const mode of ["insert", "replace"]) {
        const button = section.querySelector(`[data-chat-action="${mode}"]`);
        if (!button) continue;
        const reason = A.writeReason(turn, mode);
        button.setAttribute("aria-disabled", String(Boolean(reason)));
        button.title = reason || (mode === "insert" ? "插入到引用原文下方" : "替换原选区");
      }
      const undo = section.querySelector('[data-chat-action="undo"]');
      if (undo) {
        const unavailable = D.history.at(-1)?.aiTurnId !== turn.id || D.state.condition === "readonly";
        undo.setAttribute("aria-disabled", String(unavailable));
        undo.title = unavailable ? "请先退出只读或撤销后续操作" : "撤销此次写入";
      }
      const retry = section.querySelector('[data-chat-action="retry"]');
      if (retry) retry.disabled = isWorking;
      const notice = section.querySelector(".ai-write-notice");
      const reason = turn.status === "done" && !turn.applied ? A.writeReason(turn, "insert") : "";
      notice.textContent = reason || turn.notice || "";
      notice.hidden = !notice.textContent;
    }
  };
})();
