import { installCaretProbe, validCaret, aligns } from "./caret-state.mjs";
const fs = await import("node:fs/promises");
const task = await taskSpace(options.space);
const p = task.page("p1");
await p.goto(options.url);
await p.waitForSelector(".bn-editor");
await p.evaluate(installCaretProbe);
const variants = [
  ["paragraph"],
  ["heading", { level: 1 }],
  ["heading", { level: 2 }],
  ["heading", { level: 3 }],
  ["bulletListItem"],
  ["numberedListItem"],
  ["checkListItem"],
  ["checkListItem", { checked: true }],
  ["quote"],
  ["toggleListItem"],
  ["callout"],
  ["codeBlock"],
  ["heading", { level: 1, isToggleable: true }],
  ["heading", { level: 2, isToggleable: true }],
  ["heading", { level: 3, isToggleable: true }],
];
const result = [];
async function check(name, ok, state) {
  result.push({ name, ok, state: ok ? undefined : state });
  await fs.writeFile(options.output, JSON.stringify(result, null, 2));
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` ${JSON.stringify(state)}`}`);
}
for (const [type, props = {}] of variants.slice(options.start ?? 0, options.end ?? variants.length)) {
  const name = type + JSON.stringify(props);
  await p.evaluate(
    ({ type, props }) => {
      const e = window.__gooseNoteEditor;
      e.replaceBlocks(e.document, [{ id: "caret-case", type, props, content: [] }]);
      e.setTextCursorPosition("caret-case", "start");
    },
    { type, props },
  );
  await p.waitForSelector('[data-id="caret-case"] .bn-inline-content');
  await p.click('[data-id="caret-case"] .bn-inline-content');
  const empty = await p.evaluate(() => window.__caretRead());
  await check(
    `${name} 空块选区与光标样式`,
    validCaret(empty) && empty.text === "" && empty.id === "caret-case" && empty.type === type,
    empty,
  );
  await p.keyboard.insertText("中AB");
  const typed = await p.evaluate(() => window.__caretRead());
  await check(
    `${name} 首字基线与空光标一致`,
    aligns(typed) &&
      Math.abs(empty.caret.left - typed.firstGlyph.left) < 2 &&
      Math.abs(empty.caret.top - typed.firstGlyph.top) < 2,
    { empty, typed },
  );
  await check(`${name} 输入后落点`, typed.text === "中AB" && aligns(typed), typed);
  await p.keyboard.press("ArrowLeft");
  await p.keyboard.insertText("界");
  const middle = await p.evaluate(() => window.__caretRead());
  await check(`${name} 行中插入`, middle.text === "中A界B" && aligns(middle), middle);
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press(type === "codeBlock" ? "Enter" : "Shift+Enter");
  const soft = await p.evaluate(() => window.__caretRead());
  await check(
    `${name} ${type === "codeBlock" ? "Enter" : "Shift+Enter"} 空行`,
    validCaret(soft) && soft.id === "caret-case" && soft.caret.top > middle.caret.top + 5,
    soft,
  );
  await p.keyboard.insertText("续");
  const continued = await p.evaluate(() => window.__caretRead());
  const text = continued.document
    .find((b) => b.id === "caret-case")
    ?.content?.map((x) => x.text ?? "")
    .join("");
  await check(
    `${name} ${type === "codeBlock" ? "Enter" : "Shift+Enter"} 后输入`,
    text === "中A界B\n续" && aligns(continued) && Math.abs(soft.caret.top - continued.glyph.top) < 2,
    continued,
  );
  if (type === "codeBlock") {
    await p.keyboard.press("Shift+Enter");
    const exit = await p.evaluate(() => window.__caretRead());
    await check(
      `${name} Shift+Enter 退出代码块`,
      validCaret(exit) && exit.type === "paragraph" && exit.id !== "caret-case" && exit.text === "",
      exit,
    );
    await p.keyboard.insertText("外");
    const outside = await p.evaluate(() => window.__caretRead());
    await check(`${name} 退出后输入落点`, outside.text === "外" && aligns(outside), outside);
  }
  await p.keyboard.press("Backspace");
  const trailing = await p.evaluate(() => window.__caretRead());
  await check(
    `${name} 软换行后删空`,
    validCaret(trailing) && (type === "codeBlock" || Math.abs(trailing.caret.top - soft.caret.top) < 2),
    trailing,
  );
}
await fs.writeFile(options.output, JSON.stringify(result, null, 2));
if (result.some((r) => !r.ok)) process.exitCode = 1;
