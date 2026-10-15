(() => {
  const D = window.TableDesign, S = D.state;
  const A = D.ai = { quotes: [], turns: [], job: null, epoch: 0 };
  let sequence = 0;
  A.id = (prefix) => `${prefix}-${++sequence}`;
  A.hash = (text) => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  };
  A.summary = text => {
    const chars = Array.from(text.replace(/\s+/g, " ").trim());
    return chars.slice(0, 16).join("") + (chars.length > 16 ? "…" : "");
  };
  const isTable = quote => ["grid", "cell"].includes(quote.context);
  const offset = (root, node, at) => {
    const range = document.createRange();
    range.selectNodeContents(root); range.setEnd(node, at);
    return range.toString().length;
  };
  A.capture = (wholeNote = false) => {
    const native = !wholeNote && D.savedRange?.startContainer.isConnected ? D.savedRange : null;
    let nodes = D.isTable()
      ? (wholeNote ? [...D.table.querySelectorAll("td")] : D.cells()).map(cell => cell.querySelector(".cell-content"))
      : wholeNote ? [...D.stage.querySelectorAll("[data-block]")] : D.selectedBlocks();
    const text = wholeNote
      ? D.isTable() ? D.rows.map(row => row.join("\t")).join("\n") : nodes.map(node => node.innerText).join("\n\n")
      : D.selectionText().trim();
    if ((!wholeNote && !D.hasSelection()) || !text.trim()) return null;
    if (native) {
      const candidates = D.isTable() ? D.table.querySelectorAll(".cell-content") : D.stage.querySelectorAll("[data-block]");
      nodes = [...candidates].filter(node => native.intersectsNode(node));
    }
    if (!nodes.length) return null;
    const targets = nodes.map(node => {
      node.dataset.aiSource ||= A.id("source");
      const cell = node.closest("td");
      return {
        id: node.dataset.aiSource, html: node.innerHTML,
        row: cell ? Number(cell.dataset.row) : null, col: cell ? Number(cell.dataset.col) : null,
      };
    });
    let range = null;
    if (native && nodes.length === 1 && nodes[0].contains(native.startContainer) && nodes[0].contains(native.endContainer)) {
      range = { start: offset(nodes[0], native.startContainer, native.startOffset), end: offset(nodes[0], native.endContainer, native.endOffset) };
    }
    return {
      id: A.id("quote"), pageId: D.isTable() ? "config" : `sample-${S.context}`,
      title: document.querySelector(".document h1").textContent, text, textHash: A.hash(text),
      context: S.context, label: wholeNote ? "当前笔记" : D.contextLabel(), scope: wholeNote ? "note" : "selection",
      targets, range, partial: Boolean(native && !range),
      bounds: D.isTable() ? wholeNote ? { top: 0, left: 0, bottom: D.rows.length - 1, right: D.headers.length - 1 } : { ...D.bounds() } : null,
      epoch: A.epoch, readonly: S.condition === "readonly",
    };
  };
  A.sourceRoot = quote => {
    if (isTable(quote)) return D.table;
    if (S.context === quote.context) return D.stage;
    const root = document.createElement("div");
    root.innerHTML = D.sampleCache[quote.context] || D.sampleMarkup[quote.context] || "";
    return root;
  };
  A.sourceNodes = quote => {
    const root = A.sourceRoot(quote);
    return quote.targets.map(target => root.querySelector(`[data-ai-source="${target.id}"]`));
  };
  A.sourceError = quote => {
    if (!quote || quote.epoch !== A.epoch) return "原文已重置，请重新选择并加入对话。";
    const nodes = A.sourceNodes(quote);
    if (nodes.some(node => !node)) return "原位置已不存在，请重新加入选区。";
    if (nodes.some((node, index) => node.innerHTML !== quote.targets[index].html)) {
      return "原文已变化，未覆盖内容。请重新引用后发送，或复制此结果。";
    }
    return "";
  };
  A.writeReason = (turn, mode) => {
    const quote = turn.quotes[turn.destination || 0];
    if (turn.status !== "done") return "回复完成后才能写入。";
    if (turn.applied) return "此结果已写入，可先撤销。";
    if (!turn.result.trim()) return "结果不能为空。";
    if (S.condition === "readonly" || quote.readonly) return "只读内容无法写入，可复制结果；编辑后请重新引用。";
    const stale = A.sourceError(quote);
    if (stale) return stale;
    if (mode !== "replace") return "";
    if (quote.partial) return "跨块文字选区请使用插入下方，保留未选中的内容。";
    if (!isTable(quote) && quote.targets.length !== 1) return "多个内容块请使用插入下方。";
    if (isTable(quote) && quote.targets.length > 1) {
      const b = quote.bounds, lines = turn.result.split("\n").map(line => line.split("\t"));
      if (lines.length !== b.bottom - b.top + 1 || lines.some(line => line.length !== b.right - b.left + 1)) {
        return "替换表格需保持原有行列数（Tab 分列）；此结果可插入下方。";
      }
    }
    return "";
  };
  A.locate = quote => {
    const nodes = A.sourceNodes(quote);
    if (nodes.some(node => !node)) return D.toast("原位置已不存在");
    const condition = S.condition;
    if (S.context !== quote.context) D.setContext(quote.context);
    if (isTable(quote)) {
      const b = quote.bounds;
      D.select([b.top, b.left], [b.bottom, b.right]);
    } else {
      const ids = new Set(quote.targets.map(item => item.id));
      D.stage.querySelectorAll("[data-block]").forEach(node => node.classList.toggle("is-block-selected", ids.has(node.dataset.aiSource)));
      S.sampleSelected = true;
      if (S.condition === "empty") S.condition = "normal";
    }
    if (condition === "readonly") D.setCondition("readonly");
    D.update();
    const target = A.sourceNodes(quote)[0];
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return target;
  };
  const textRange = (node, start, end) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let count = 0, begun = false, current;
    while ((current = walker.nextNode())) {
      const next = count + current.length;
      if (!begun && start <= next) { range.setStart(current, start - count); begun = true; }
      if (begun && end <= next) { range.setEnd(current, end - count); return range; }
      count = next;
    }
    throw new Error("文字位置已失效，请重新引用。");
  };
  const linesMarkup = text => {
    const lines = text.split("\n");
    const checklist = lines.every(line => /^- \[ \] /.test(line));
    return checklist
      ? `<ul class="ai-checklist">${lines.map(line => `<li><span aria-hidden="true" class="ai-check-box"></span><span data-format>${D.escape(line.slice(6))}</span></li>`).join("")}</ul>`
      : lines.map(line => `<p><span data-format>${D.escape(line) || "<br>"}</span></p>`).join("");
  };
  const replaceBlock = (node, value) => {
    const kind = node.dataset.block;
    if (kind === "code") node.querySelector("code").textContent = value;
    else if (kind === "heading") node.querySelector("h2,h3").textContent = value;
    else if (kind === "list") {
      node.querySelector("ul,ol").innerHTML = value.split("\n").map(line => `<li><span data-format>${D.escape(line)}</span></li>`).join("");
    } else if (kind === "quote") node.querySelector("blockquote").innerHTML = linesMarkup(value);
    else node.innerHTML = linesMarkup(value);
  };
  A.apply = (turn, mode) => {
    const reason = A.writeReason(turn, mode);
    if (reason) { turn.notice = reason; A.renderMessages(); return; }
    const quote = turn.quotes[turn.destination || 0];
    A.locate(quote);
    const nodes = A.sourceNodes(quote);
    // Validate the saved text offsets before taking a history entry or mutating content.
    const range = mode === "replace" && quote.range ? textRange(nodes[0], quote.range.start, quote.range.end) : null;
    D.remember(turn.id);
    D.clearNativeRange(); D.nativeTarget = null;
    let inserted = null;
    if (mode === "insert") {
      inserted = document.createElement("div");
      inserted.className = "sample-block ai-inserted-block";
      inserted.dataset.block = "text"; inserted.dataset.aiSource = A.id("source");
      inserted.tabIndex = 0; inserted.innerHTML = linesMarkup(turn.result);
      if (isTable(quote)) document.querySelector(".ai-insertions").append(inserted);
      else nodes.at(-1).after(inserted);
    } else if (range) {
      range.deleteContents(); range.insertNode(document.createTextNode(turn.result));
    } else if (isTable(quote)) {
      const values = quote.targets.length === 1 ? [turn.result] : turn.result.split("\n").flatMap(line => line.split("\t"));
      nodes.forEach((node, index) => { node.textContent = values[index]; });
    } else replaceBlock(nodes[0], turn.result);
    if (isTable(quote)) quote.targets.forEach((target, index) => { D.rows[target.row][target.col] = nodes[index].textContent; });
    turn.applied = mode; turn.notice = "";
    A.renderMessages(); D.update();
    (inserted || nodes[0]).scrollIntoView({ block: "nearest", inline: "nearest" });
    D.toast(mode === "insert" ? "已插入原文下方，可撤销" : "已替换原选区，可撤销");
  };
  A.didUndo = id => {
    const turn = [...A.turns, ...(A.sessions || []).flatMap(session => session.turns)].find(item => item.id === id);
    if (turn) { turn.applied = null; turn.notice = "已撤销写入，回复仍保留。"; A.renderMessages(); }
  };
})();
