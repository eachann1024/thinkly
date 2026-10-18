import { installCaretProbe, validCaret, aligns } from "./caret-state.mjs";

const task = await taskSpace(options.space),
  p = task.page("p1");
await p.goto(options.url);
await p.waitForSelector(".bn-editor");
await p.evaluate(installCaretProbe);
const fs = await import("node:fs/promises"),
  results = [];
async function check(name, ok, state) {
  results.push({ name, ok, state: ok ? undefined : state });
  await fs.writeFile(options.output, JSON.stringify(results, null, 2));
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` ${JSON.stringify(state)}`}`);
}
const read = () => p.evaluate(() => window.__caretRead());
async function seed(blocks) {
  await p.evaluate(
    (blocks) => window.__gooseNoteEditor.replaceBlocks(window.__gooseNoteEditor.document, blocks),
    blocks,
  );
}
async function cursor(id, end = false) {
  await p.evaluate(
    ({ id, end }) => {
      const e = window.__gooseNoteEditor;
      e.setTextCursorPosition(id, end ? "end" : "start");
      e.focus();
    },
    { id, end },
  );
}
const text = (value) => ({ type: "text", text: value });

await seed([{ id: "ix", type: "paragraph", content: "甲乙丙" }]);
await cursor("ix");
await p.keyboard.press("ArrowRight");
const splitBefore = await read();
await p.keyboard.press("Enter");
let s = await read();
let doc = s.document;
await check(
  "段落 Enter 分块并保留后半段起始 caret",
  splitBefore.id === "ix" &&
    splitBefore.from === splitBefore.domPosition &&
    doc.length === 2 &&
    doc[0].content[0].text === "甲" &&
    doc[1].content[0].text === "乙丙" &&
    s.id !== "ix" &&
    validCaret(s) &&
    Math.abs(s.caret.left - s.firstGlyph.left) < 2,
  { splitBefore, doc, s },
);
await p.keyboard.insertText("新段");
s = await read();
await check(
  "段落 Enter 后输入",
  s.document.length === 2 && s.document[1].content?.[0]?.text === "新段乙丙" && aligns(s),
  s,
);

await seed([{ id: "li", type: "bulletListItem", content: "项目" }]);
await cursor("li", true);
await p.keyboard.press("Enter");
s = await read();
await check("列表 Enter 创建同级续行", s.type === "bulletListItem" && s.id !== "li" && validCaret(s), s);
await p.keyboard.insertText("续行");
s = await read();
await check("列表续行输入", s.type === "bulletListItem" && s.text === "续行" && aligns(s), s);

await seed([{ id: "soft", type: "paragraph", content: "甲" }]);
await cursor("soft", true);
for (let i = 0; i < 3; i++) await p.keyboard.press("Shift+Enter");
const breaks = await read();
await p.keyboard.insertText("尾");
s = await read();
await check(
  "连续 Shift+Enter 空行后输入",
  s.text === "甲尾" &&
    s.document[0].content[0].text === "甲\n\n\n尾" &&
    aligns(s) &&
    Math.abs(s.caret.top - breaks.caret.top) < 2,
  { breaks, s },
);

await seed([{ id: "paste", type: "paragraph", content: [] }]);
await cursor("paste");
await p.keyboard.paste("第一行\n第二行");
s = await read();
doc = s.document;
await check(
  "多行 paste 转为两行内容",
  doc.length === 2 &&
    doc.map((b) => b.content?.map((x) => x.text ?? "").join("")).join("\n") === "第一行\n第二行" &&
    validCaret(s),
  { doc, s },
);

await seed([{ id: "history", type: "paragraph", content: "原文" }]);
await cursor("history", true);
await p.keyboard.insertText("新");
const afterInput = await read();
await p.keyboard.press("Meta+z");
let undo = await read();
await p.keyboard.press("Meta+Shift+z");
let redo = await read();
await check(
  "undo/redo 恢复正文和 caret",
  afterInput.text === "原文新" && undo.text === "原文" && redo.text === "原文新" && aligns(redo),
  { afterInput, undo, redo },
);
await p.keyboard.press("Meta+a");
await p.keyboard.press("Backspace");
let empty = await read();
await p.keyboard.insertText("重输");
s = await read();
await check("删空后重输", empty.text === "" && validCaret(empty) && s.text === "重输" && aligns(s), {
  empty,
  s,
});

await seed([
  { id: "cross-a", type: "paragraph", content: "甲块" },
  { id: "cross-b", type: "paragraph", content: "乙块" },
]);
await cursor("cross-a", true);
await p.keyboard.press("Shift+ArrowDown");
await p.keyboard.press("Shift+End");
const selected = await p.evaluate(() => {
  const sel = getSelection(),
    view = window.__gooseNoteEditor.prosemirrorView,
    range = view.state.selection;
  return {
    text: sel?.toString(),
    anchor: sel?.anchorNode?.parentElement?.closest("[data-id]")?.dataset.id,
    focus: sel?.focusNode?.parentElement?.closest("[data-id]")?.dataset.id,
    from: range.from,
    to: range.to,
    domAnchor: view.posAtDOM(sel.anchorNode, sel.anchorOffset),
    domFocus: view.posAtDOM(sel.focusNode, sel.focusOffset),
  };
});
await p.keyboard.insertText("替换");
s = await read();
const crossText = s.document.map((b) => b.content?.map((x) => x.text ?? "").join("") ?? "");
await check(
  "跨块精确选区替换且PM/DOM映射一致",
  selected.anchor === "cross-a" &&
    selected.focus === "cross-b" &&
    selected.text === "\n乙块" &&
    Math.min(selected.domAnchor, selected.domFocus) === selected.from &&
    Math.max(selected.domAnchor, selected.domFocus) === selected.to &&
    crossText.join("") === "甲块替换" &&
    s.document.length === 1 &&
    validCaret(s),
  { selected, crossText, s },
);

await seed([{ id: "scroll", type: "paragraph", content: "" }]);
const long = "长文本滚动测试abcdef中文 ".repeat(110);
await cursor("scroll");
await p.keyboard.insertText(long);
await p.keyboard.press("Shift+Enter");
await p.keyboard.insertText("末尾");
s = await read();
let visible = await p.evaluate((caret) => {
  const main = document.querySelector("main"),
    r = main.getBoundingClientRect();
  return {
    scrollTop: main.scrollTop,
    windowY: scrollY,
    top: caret.top,
    bottom: caret.bottom,
    clipTop: Math.max(0, r.top),
    clipBottom: Math.min(innerHeight, r.bottom),
  };
}, s.caret);
await check(
  "长文末尾与软换行后 caret 保持可见",
  aligns(s) &&
    (visible.scrollTop > 0 || visible.windowY > 0) &&
    visible.top >= visible.clipTop &&
    visible.bottom <= visible.clipBottom,
  { s, visible },
);
await p.keyboard.press("Home");
let home = await read();
await p.keyboard.press("ArrowDown");
let down = await read();
await p.keyboard.press("End");
let end = await read();
await check(
  "滚动后 Home/ArrowDown/End 行导航",
  validCaret(home) && validCaret(down) && validCaret(end) && home.from !== end.from,
  { home, down, end },
);

await seed([
  {
    id: "attachment",
    type: "file",
    props: { url: "data:text/plain,acceptance", name: "验收.txt", size: 10, mimeType: "text/plain" },
  },
]);
await p.click('[data-id="attachment"] [title="重命名"]');
let rename = await p.evaluate(() => {
  const i = document.querySelector(".goose-file-block-name-input");
  return i && { value: i.value, start: i.selectionStart, end: i.selectionEnd };
});
await check(
  "附件重命名初始全选",
  rename?.value === "验收.txt" && rename.start === 0 && rename.end === rename.value.length,
  rename,
);
await p.keyboard.press("Meta+a");
await p.keyboard.insertText("测试文件.txt");
await p.keyboard.press("ArrowLeft");
await p.keyboard.insertText("中");
rename = await p.evaluate(() => {
  const i = document.querySelector(".goose-file-block-name-input");
  return i && { value: i.value, start: i.selectionStart, end: i.selectionEnd };
});
await check(
  "附件重命名输入与中间插入",
  rename?.value === "测试文件.tx中t" && rename.start === 8 && rename.end === 8,
  rename,
);
await p.keyboard.press("Shift+Enter");
let name = await p.evaluate(
  () => window.__gooseNoteEditor.document.find((b) => b.id === "attachment")?.props.name,
);
await check("附件重命名 Shift+Enter 提交（源码契约）", name === "测试文件.tx中t", name);
await p.click('[data-id="attachment"] [title="重命名"]');
await p.keyboard.press("Meta+a");
await p.keyboard.insertText("取消.txt");
await p.keyboard.press("Escape");
name = await p.evaluate(
  () => window.__gooseNoteEditor.document.find((b) => b.id === "attachment")?.props.name,
);
await check("附件重命名 Escape 取消", name === "测试文件.tx中t", name);
await p.click('[data-id="attachment"] [title="重命名"]');
await p.keyboard.press("Meta+a");
await p.keyboard.insertText("提交.txt");
await p.keyboard.press("Enter");
name = await p.evaluate(
  () => window.__gooseNoteEditor.document.find((b) => b.id === "attachment")?.props.name,
);
await check("附件重命名 Enter 提交到编辑器块", name === "提交.txt", name);
if (results.some((result) => !result.ok))
  throw new Error(`${results.filter((result) => !result.ok).length} caret interaction checks failed`);
