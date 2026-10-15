(() => {
  const A = window.TableDesign.ai;
  A.respond = (quotes, prompt) => {
    const source = quotes.map(quote => quote.text).join("\n\n");
    if (/清单|待办/.test(prompt)) {
      return source.split("\n").filter(line => line.trim())
        .map(line => `- [ ] ${line.replace(/\t/g, " · ").replace(/^[-*]\s*(\[[ x]\]\s*)?/, "").trim()}`).join("\n");
    }
    if (/空格|空白|格式/.test(prompt)) {
      return source.split("\n").map(line => line.split("\t").map(cell => cell.trim().replace(/[ \u3000]+/g, " ")).join("\t")).join("\n");
    }
    if (/大写/.test(prompt)) return source.toUpperCase();
    const replacement = prompt.match(/^替换为[：:]\s*([\s\S]+)$/);
    if (replacement) return replacement[1].trim();
    throw new Error("此预览支持「整理成清单」「统一空格」「转为大写」或「替换为：内容」。");
  };
  A.startReply = turn => {
    if (A.job) return;
    turn.status = "pending"; turn.result = ""; turn.error = ""; turn.notice = "";
    const fail = Boolean(A.simulateFailure);
    A.simulateFailure = false;
    const job = A.job = { turn, timer: null };
    A.renderMessages(true); A.refreshControls();
    const failReply = message => {
      if (A.job !== job) return;
      turn.status = "failed"; turn.error = message;
      A.job = null; A.renderMessages(true); A.refreshControls();
      A.announce("回复失败，可点击重试");
    };
    job.timer = setTimeout(() => {
      if (A.job !== job) return;
      if (fail) return failReply("回复失败（模拟）。选区与指令已保留，点击重试即可继续。");
      let result;
      try { result = A.respond(turn.quotes, turn.prompt); }
      catch (error) { failReply(error.message); return; }
      const chars = Array.from(result);
      let cursor = 0;
      const tick = () => {
        if (A.job !== job) return;
        cursor = Math.min(chars.length, cursor + Math.max(4, Math.ceil(chars.length / 16)));
        turn.result = chars.slice(0, cursor).join("");
        A.updateStream(turn);
        if (cursor < chars.length) { job.timer = setTimeout(tick, 55); return; }
        turn.status = "done"; A.job = null;
        A.renderMessages(true); A.refreshControls(); A.announce("回复完成，可选择插入或替换");
      };
      tick();
    }, 350);
  };
  A.stopReply = () => {
    if (!A.job) return;
    const { turn, timer } = A.job;
    clearTimeout(timer); A.job = null;
    turn.status = "stopped";
    A.renderMessages(); A.refreshControls();
    A.announce("已停止生成");
  };
})();
