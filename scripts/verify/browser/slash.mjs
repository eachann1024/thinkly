const task = await taskSpace(options.space);
const page = task.page("p1");
const fs = await import("node:fs/promises");
const rows = [];
await fs.writeFile(options.output, "[]");

async function result(name, ok, detail = {}) {
  rows.push({ name, ok: Boolean(ok), detail });
  await fs.writeFile(options.output, JSON.stringify(rows, null, 2));
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` ${JSON.stringify(detail)}`}`);
}

async function fresh(blocks, id, edge = "start") {
  await page.goto(options.url);
  await page.waitForSelector(".bn-editor");
  await page.waitForTimeout(250);
  await page.evaluate((value) => window.__gooseNoteEditor.replaceBlocks(
    window.__gooseNoteEditor.document, value.blocks,
  ), { blocks });
  await page.click(".bn-editor");
  await page.evaluate(({ id, edge }) => {
    const e = window.__gooseNoteEditor;
    e.setTextCursorPosition(id, edge);
    e.focus();
  }, { id, edge });
  await page.waitForFunction(() => window.__gooseNoteEditor.prosemirrorView.hasFocus());
}

async function typeCommand() {
  await page.keyboard.type("/cod");
  try {
    await page.waitForSelector('[data-notion-slash-root="true"] .goose-menu-item', { timeout: 1500 });
    return true;
  } catch { return false; }
}

async function state() {
  return page.evaluate(() => {
    const e = window.__gooseNoteEditor, v = e.prosemirrorView, s = v.state.selection;
    const n = window.getSelection();
    const menus = [...document.querySelectorAll('[data-notion-slash-root="true"]')].map((el) => {
      const css = getComputedStyle(el), r = el.getBoundingClientRect();
      return { display: css.display, visibility: css.visibility, opacity: css.opacity,
        width: r.width, height: r.height,
        visible: css.display !== "none" && css.visibility !== "hidden" && Number(css.opacity) > 0 && r.width > 0 && r.height > 0 };
    });
    return {
      doc: e.document.map(({ id, type, content, props }) => ({ id, type, content, props })),
      pm: { from: s.from, to: s.to, parent: s.$from.parent.type.name,
        parentOffset: s.$from.parentOffset, focused: v.hasFocus(),
        text: v.state.doc.textBetween(0, v.state.doc.content.size, "\n") },
      native: { anchor: n?.anchorNode?.parentElement?.outerHTML?.slice(0, 240),
        anchorOffset: n?.anchorOffset, focus: n?.focusNode?.parentElement?.outerHTML?.slice(0, 240),
        focusOffset: n?.focusOffset, rangeCount: n?.rangeCount },
      menuCount: menus.length, menuVisibleCount: menus.filter((m) => m.visible).length, menus,
    };
  });
}

async function cold(method) {
  await fresh([{ id: "cold", type: "paragraph", content: [] }], "cold");
  const opened = await typeCommand();
  const items = await page.evaluate(() => [...document.querySelectorAll(
    '[data-notion-slash-root] .goose-menu-item',
  )].map((el) => ({ text: el.textContent?.trim(), disabled: el.disabled })));
  const item = items.find((x) => /代码块|code block/i.test(x.text ?? ""));
  if (!opened || !item || item.disabled) {
    await result(`cold ${method} candidate`, false, { opened, items, state: await state() });
    return;
  }
  if (method === "click") {
    const box = await page.evaluate(() => {
      const item = [...document.querySelectorAll('[data-notion-slash-root] .goose-menu-item')]
        .find((el) => /代码块|code block/i.test(el.textContent ?? ""));
      if (!item) return null;
      const r = item.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: item.textContent?.trim() };
    });
    if (!box) { await result("cold click candidate geometry", false, { items, state: await state() }); return; }
    await page.mouse.click(box.x, box.y, { label: "accept code block slash item" });
  }
  else await page.keyboard.press(method);
  const t0 = Date.now();
  await page.keyboard.type(`COLD_${method}`);
  const inputMs = Date.now() - t0;
  let menuClosed = true;
  try {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-notion-slash-root="true"]')].every((el) => {
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      return c.display === "none" || c.visibility === "hidden" || Number(c.opacity) === 0 || !r.width || !r.height;
    }), undefined, { timeout: 1200 });
  } catch { menuClosed = false; }
  const s = await state(), code = s.doc.find((b) => b.type === "codeBlock");
  await result(`cold ${method} accept then immediate typing in code`, Boolean(
    code && JSON.stringify(code.content).includes(`COLD_${method}`) && s.pm.focused && menuClosed,
  ), { inputMs, menuClosed, state: s });
}

for (const method of ["Enter", "Tab", "click"]) await cold(method);

// Existing code selection uses the real native text range inside its editable content.
await fresh([{ id: "code-selected", type: "codeBlock", content: "before target after" }], "code-selected");
const selectionSetup = await page.evaluate(() => {
  const e = window.__gooseNoteEditor, v = e.prosemirrorView;
  const root = document.querySelector('[data-content-type="codeBlock"] [data-node-view-content-react]');
  const text = root?.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE) return { error: "editable text node missing", html: root?.outerHTML };
  const range = document.createRange();
  e.focus();
  range.setStart(text, 7); range.setEnd(text, 13);
  const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
  const s = v.state.selection;
  return { text: text.textContent, pm: { from: s.from, to: s.to, parent: s.$from.parent.type.name,
    parentOffset: s.$from.parentOffset }, native: { anchor: native?.anchorNode?.nodeName,
    anchorOffset: native?.anchorOffset, focusOffset: native?.focusOffset } };
});
await page.waitForFunction(() => {
  const s = window.__gooseNoteEditor.prosemirrorView.state.selection;
  return s.$from.parent.type.name === "codeBlock" && s.$from.parentOffset === 7 && s.$to.parentOffset === 13;
});
const selectedRange = await page.evaluate(() => {
  const s = window.__gooseNoteEditor.prosemirrorView.state.selection;
  return { from: s.from, to: s.to, parent: s.$from.parent.type.name,
    parentOffset: s.$from.parentOffset, endOffset: s.$to.parentOffset };
});
await page.evaluate(() => {
  const view = window.__gooseNoteEditor.prosemirrorView;
  window.__slashInputEvents = [];
  const log = (event, phase) => {
    const s = view.state.selection;
    window.__slashInputEvents.push({ phase, type: event.inputType, data: event.data,
      defaultPrevented: event.defaultPrevented,
      selection: { from: s.from, to: s.to, parent: s.$from.parent.type.name,
        parentOffset: s.$from.parentOffset, endOffset: s.$to.parentOffset },
      text: view.state.doc.textBetween(0, view.state.doc.content.size, "\n"),
      ranges: event.getTargetRanges?.().map((r) => ({ start: r.startContainer?.parentElement?.outerHTML?.slice(0, 180),
        startOffset: r.startOffset, end: r.endContainer?.parentElement?.outerHTML?.slice(0, 180), endOffset: r.endOffset })) });
  };
  document.addEventListener("beforeinput", (event) => log(event, "capture"), { capture: true });
  document.addEventListener("beforeinput", (event) => log(event, "bubble"));
});
await page.keyboard.type("new");
let s = await state();
const trace = await page.evaluate(() => window.__slashInputEvents);
await result("existing code selection replacement", selectedRange.parent === "codeBlock" &&
  s.doc[0]?.type === "codeBlock" && JSON.stringify(s.doc[0].content).includes("before new after"),
  { selectionSetup, selectedRange, trace, state: s });

await fresh([{ id: "paragraph-replace", type: "paragraph", content: "before target after" }], "paragraph-replace");
const paragraphRange = await page.evaluate(() => {
  const e = window.__gooseNoteEditor, v = e.prosemirrorView;
  const text = document.querySelector('[data-content-type="paragraph"] .bn-inline-content')?.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE) return { error: "paragraph text node missing" };
  const range = document.createRange(); e.focus(); range.setStart(text, 7); range.setEnd(text, 13);
  const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
  const selection = v.state.selection;
  return { parent: selection.$from.parent.type.name, fromOffset: selection.$from.parentOffset,
    toOffset: selection.$to.parentOffset };
});
await page.waitForFunction(() => {
  const selection = window.__gooseNoteEditor.prosemirrorView.state.selection;
  return selection.$from.parent.type.name === "paragraph" && selection.$from.parentOffset === 7 &&
    selection.$to.parentOffset === 13;
});
await page.keyboard.type("n"); s = await state();
await result("paragraph selection replacement commits synchronously", paragraphRange.parent === "paragraph" &&
  s.doc[0]?.type === "paragraph" && JSON.stringify(s.doc[0].content).includes("before n after"),
  { paragraphRange, events: await page.evaluate(() => window.__slashInputEvents), state: s });

await fresh([{ id: "paragraph-delete", type: "paragraph", content: "before target after" }], "paragraph-delete");
const deleteRange = await page.evaluate(() => {
  const e = window.__gooseNoteEditor, v = e.prosemirrorView;
  const text = document.querySelector('[data-content-type="paragraph"] .bn-inline-content')?.firstChild;
  const range = document.createRange(); e.focus(); range.setStart(text, 7); range.setEnd(text, 13);
  const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
  const selection = v.state.selection;
  return { parent: selection.$from.parent.type.name, fromOffset: selection.$from.parentOffset,
    toOffset: selection.$to.parentOffset };
});
await page.waitForFunction(() => {
  const selection = window.__gooseNoteEditor.prosemirrorView.state.selection;
  return selection.$from.parent.type.name === "paragraph" && selection.$from.parentOffset === 7 &&
    selection.$to.parentOffset === 13;
});
await page.keyboard.press("Backspace"); s = await state();
await result("paragraph selection deletion commits synchronously", deleteRange.parent === "paragraph" &&
  s.doc[0]?.type === "paragraph" && JSON.stringify(s.doc[0].content).includes("before  after"),
  { deleteRange, state: s });

await fresh([{ id: "code-paste", type: "codeBlock", content: [] }], "code-paste");
await page.keyboard.paste("PASTE_CODE"); s = await state();
await result("paste into existing code block", s.doc[0]?.type === "codeBlock" &&
  JSON.stringify(s.doc[0].content).includes("PASTE_CODE"), s);

await fresh([{ id: "code-plain", type: "codeBlock", content: [] }], "code-plain");
await page.keyboard.type("ordinaryCodeInput"); s = await state();
await result("ordinary existing code typing", s.doc[0]?.type === "codeBlock" &&
  JSON.stringify(s.doc[0].content).includes("ordinaryCodeInput"), s);

await fresh([{ id: "paragraph-plain", type: "paragraph", content: [] }], "paragraph-plain");
await page.keyboard.type("ordinaryParagraphInput"); s = await state();
await result("ordinary paragraph input is unaffected", s.doc[0]?.type === "paragraph" &&
  JSON.stringify(s.doc[0].content).includes("ordinaryParagraphInput"), s);

await fresh([{ id: "trigger", type: "paragraph", content: "left tail" }], "trigger", "start");
const opened = await typeCommand();
await page.keyboard.press("Enter"); s = await state();
await result("block-start slash transform preserves original same-block text", opened &&
  s.doc.some((b) => b.type === "codeBlock") && JSON.stringify(s.doc).includes("left tail"), s);

await fresh([{ id: "geometry", type: "paragraph", content: [] }], "geometry");
await typeCommand();
const rect = () => page.evaluate(() => {
  const row = document.querySelector('[data-notion-slash-root] .goose-menu-item');
  const icon = row?.querySelector(":scope > span:first-child"), title = row?.querySelector(":scope > span:nth-child(2)");
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  return { row: box(row), icon: box(icon), title: box(title), align: getComputedStyle(row).alignItems };
});
const before = await rect(); await page.hover('[data-notion-slash-root] .goose-menu-item'); const hover = await rect();
await page.keyboard.press("ArrowDown"); const focus = await rect();
const stable = (a, b) => a && b && ["x", "y", "w", "h"].every((k) => Math.abs(a[k] - b[k]) < 0.5);
await result("menu focus/hover geometry and icon/text vertical center", stable(before.row, hover.row) &&
  stable(before.row, focus.row) && before.icon && before.title &&
  Math.abs(before.icon.y + before.icon.h / 2 - before.title.y - before.title.h / 2) <= 2,
  { before, hover, focus });

await fresh([{ id: "undo", type: "paragraph", content: [] }], "undo");
await typeCommand(); await page.keyboard.press("Enter"); await page.keyboard.press("Meta+z"); s = await state();
await result("Undo restores the original paragraph", s.doc.length === 1 && s.doc[0]?.type === "paragraph", s);

await fs.writeFile(options.output, JSON.stringify(rows, null, 2));
console.log(`JSON ${options.output}`);
if (rows.some((row) => !row.ok)) process.exitCode = 1;
