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
  await p.evaluate((blocks) => {
    const e = window.__gooseNoteEditor;
    e.replaceBlocks(e.document, blocks);
  }, blocks);
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
const cell = () =>
  p.evaluate(() => {
    const s = getSelection(),
      e = s.anchorNode?.parentElement?.closest("td,th");
    return e && { row: e.parentElement.rowIndex, col: e.cellIndex, text: e.textContent };
  });
function matchesCellTextSelection(state, current, expectedText) {
  const mapped = [state.domPosition, state.domFocusPosition].sort((a, b) => a - b);
  return (
    state.id === "grid" &&
    state.type === "table" &&
    state.focus &&
    !state.collapsed &&
    state.text === expectedText &&
    current?.text === expectedText &&
    mapped[0] === state.from &&
    mapped[1] === state.to &&
    state.native?.width > 0
  );
}
await seed([
  {
    id: "grid",
    type: "table",
    content: { type: "tableContent", rows: [{ cells: ["", "右"] }, { cells: ["", "末"] }] },
  },
]);
await p.click('[data-id="grid"] td p >> nth=0');
let s = await read();
await check("表格 首空单元格选区与样式", validCaret(s) && s.type === "table" && s.text === "", s);
await p.keyboard.insertText("中AB");
await p.keyboard.press("ArrowLeft");
await p.keyboard.insertText("界");
s = await read();
await check("表格 单元格内行中输入", s.text === "中A界B" && aligns(s), s);
await p.keyboard.press("Tab");
let c = await cell();
s = await read();
await check("表格 Tab 选中相邻单元格文本且DOM映射一致", c?.row === 0 && c?.col === 1 && matchesCellTextSelection(s, c, "右"), { s, c });
await p.keyboard.insertText("换");
c = await cell();
s = await read();
await check("表格 Tab 选中内容后输入替换当前单元格", c?.row === 0 && c?.col === 1 && c.text === "换" && s.text === "换" && aligns(s), { s, c });
await p.keyboard.press("Shift+Tab");
c = await cell();
s = await read();
await check("表格 Shift+Tab 返回并选中原单元格文本", c?.row === 0 && c?.col === 0 && matchesCellTextSelection(s, c, "中A界B"), { s, c });
await p.keyboard.press("End");
const first = await read();
await p.keyboard.press("Shift+Enter");
const soft = await read();
await check(
  "表格 Shift+Enter 空行",
  validCaret(soft) && soft.caret.top > first.caret.top + 5 && soft.document[0].content.rows.length === 2,
  soft,
);
await p.keyboard.insertText("续");
s = await read();
await check(
  "表格 Shift+Enter 后输入",
  s.text === "中A界B续" && aligns(s) && Math.abs(s.glyph.top - soft.caret.top) < 2,
  s,
);
await p.keyboard.press("Enter");
c = await cell();
s = await read();
await check("表格 Enter 到下一行空单元格", c?.row === 1 && c?.col === 0 && s.text === "" && validCaret(s), {
  s,
  c,
});
await p.keyboard.insertText("下");
await p.keyboard.press("Enter");
c = await cell();
s = await read();
await check(
  "表格 末行 Enter 新增行后光标",
  c?.row === 2 && c?.col === 0 && s.document[0].content.rows.length === 3 && validCaret(s),
  { s, c },
);
await p.keyboard.insertText("新");
s = await read();
await check("表格 新行输入", s.text === "新" && aligns(s), s);
const merged = { type: "tableCell", props: { colspan: 2, rowspan: 1 }, content: [] };
await seed([
  {
    id: "merged",
    type: "table",
    content: {
      type: "tableContent",
      columnWidths: [180, 180],
      headerRows: 1,
      rows: [{ cells: [merged] }, { cells: ["甲", "乙"] }],
    },
  },
]);
await p.click('[data-id="merged"] th p');
s = await read();
await check("表格 合并表头空单元格", validCaret(s) && s.text === "", s);
await p.keyboard.insertText("合");
s = await read();
await check("表格 合并表头输入", s.text === "合" && aligns(s), s);
await p.keyboard.press("Shift+Enter");
const mergedSoft = await read();
await p.keyboard.insertText("续");
s = await read();
await check(
  "表格 合并表头软换行",
  validCaret(mergedSoft) &&
    s.text === "合续" &&
    aligns(s) &&
    Math.abs(s.glyph.top - mergedSoft.caret.top) < 2,
  s,
);
for (const count of [2, 3]) {
  await seed([
    {
      id: "cols",
      type: "columnLayout",
      props: { widths: count === 2 ? "60,40" : "33,34,33" },
      children: Array.from({ length: count }, (_, i) => ({
        id: `col${i}`,
        type: "columnSection",
        children: [{ id: `leaf${i}`, type: i === 0 ? "paragraph" : "bulletListItem", content: [] }],
      })),
    },
  ]);
  for (let i = 0; i < count; i++) {
    await p.click(`[data-id="leaf${i}"] .bn-inline-content`);
    const empty = await read();
    await check(`${count}栏 第${i + 1}栏空内容`, validCaret(empty) && empty.id === `leaf${i}`, empty);
    await p.keyboard.insertText(`栏${i}`);
    s = await read();
    await check(`${count}栏 第${i + 1}栏输入`, s.text === `栏${i}` && aligns(s), s);
    await p.keyboard.press("Shift+Enter");
    const br = await read();
    await p.keyboard.insertText("续");
    s = await read();
    await check(
      `${count}栏 第${i + 1}栏软换行`,
      s.id === `leaf${i}` &&
        aligns(s) &&
        br.caret.top > empty.caret.top + 5 &&
        Math.abs(br.caret.top - s.glyph.top) < 2,
      s,
    );
  }
  await cursor("leaf1");
  await p.keyboard.press("ArrowLeft");
  s = await read();
  await check(`${count}栏 左边界返回前栏末尾`, s.id === "leaf0" && validCaret(s), s);
  await p.keyboard.press("ArrowRight");
  s = await read();
  await check(`${count}栏 右边界到后栏开头`, s.id === "leaf1" && validCaret(s), s);
}
for (const type of ["bulletListItem", "numberedListItem", "checkListItem", "toggleListItem"]) {
  await seed([{ id: "parent", type, content: "父", children: [{ id: "nested", type, content: [] }] }]);
  await p.click('[data-id="nested"] .bn-inline-content');
  const empty = await read();
  await p.keyboard.insertText("子");
  s = await read();
  await check(
    `${type} 嵌套空项输入`,
    s.id === "nested" && aligns(s) && Math.abs(empty.caret.left - s.firstGlyph.left) < 2,
    s,
  );
  await p.keyboard.press("Enter");
  s = await read();
  const toggleChild = type === "toggleListItem"
    ? await p.evaluate((id) => {
        const parent = window.__gooseNoteEditor.document.find((block) => block.id === "parent");
        const nested = parent?.children.find((block) => block.id === "nested");
        const child = nested?.children.find((block) => block.id === id);
        return {
          type: child?.type,
          parentId: nested?.id,
          position: nested?.children.findIndex((block) => block.id === id),
        };
      }, s.id)
    : null;
  const enterMatches = type === "toggleListItem"
    ? validCaret(s) && s.type === "paragraph" && toggleChild?.parentId === "nested" && toggleChild.type === "paragraph" && toggleChild.position === 0
    : validCaret(s) && s.id !== "nested" && s.type === type;
  await check(`${type} Enter 后新项光标`, enterMatches, { s, toggleChild });
  await p.keyboard.insertText("新");
  s = await read();
  const insertedToggleChild = type === "toggleListItem"
    ? await p.evaluate((id) => {
        const parent = window.__gooseNoteEditor.document.find((block) => block.id === "parent");
        const nested = parent?.children.find((block) => block.id === "nested");
        const child = nested?.children.find((block) => block.id === id);
        return child?.content?.map((item) => item.text ?? "").join("");
      }, s.id)
    : null;
  await check(`${type} 新项输入`, s.text === "新" && aligns(s) && (type !== "toggleListItem" || insertedToggleChild === "新"), { s, insertedToggleChild });
}
for (const type of ["divider", "image", "video", "audio", "file"]) {
  await seed([
    { id: "before", type: "paragraph", content: "前" },
    { id: "atom", type },
    { id: "after", type: "paragraph", content: [] },
  ]);
  const hasText = await p.evaluate(() => !!document.querySelector('[data-id="atom"] .bn-inline-content'));
  await check(`${type} 非文本块不创建文本编辑域`, !hasText);
  await p.click('[data-id="after"] .bn-inline-content');
  s = await read();
  await check(`${type} 后方空段光标`, s.id === "after" && validCaret(s), s);
  await p.keyboard.insertText("后");
  s = await read();
  await check(`${type} 后方输入落点`, s.text === "后" && aligns(s), s);
  await cursor("before", true);
  await p.keyboard.insertText("续");
  s = await read();
  await check(`${type} 前方重聚焦输入`, s.id === "before" && s.text === "前续" && aligns(s), s);
}
if (results.some((r) => !r.ok)) process.exitCode = 1;
