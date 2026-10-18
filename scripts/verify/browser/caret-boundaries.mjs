import { installCaretProbe, validCaret, aligns } from "./caret-state.mjs";
const p = (await taskSpace(options.space)).page("p1");
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
async function seed(content, type = "paragraph", props = {}) {
  await p.evaluate(
    ({ content, type, props }) => {
      const e = window.__gooseNoteEditor;
      e.replaceBlocks(e.document, [{ id: "boundary", type, props, content }]);
      e.setTextCursorPosition("boundary", "start");
      e.focus();
    },
    { content, type, props },
  );
}
const text = (text, styles = {}) => ({ type: "text", text, styles });
for (const styles of [
  { bold: true },
  { italic: true },
  { underline: true },
  { strike: true },
  { textColor: "red" },
  { code: true },
]) {
  const tag = Object.keys(styles)[0];
  for (const side of ["left-outside", "left-inside", "right-inside", "right-outside"]) {
    await seed([text("前"), text("AB", styles), text("后")]);
    if (side.startsWith("left")) {
      await p.keyboard.press("ArrowRight");
      if (side === "left-inside") await p.keyboard.press("ArrowRight");
    } else {
      await p.evaluate(() => {
        const e = window.__gooseNoteEditor;
        e.setTextCursorPosition("boundary", "end");
        e.focus();
      });
      await p.keyboard.press("ArrowLeft");
      if (side === "right-inside") await p.keyboard.press("ArrowLeft");
    }
    const before = await read();
    await p.keyboard.insertText("界");
    const s = await read();
    const plain = s.document[0].content.map((x) => x.text ?? "").join("");
    const expected =
      side === "left-outside"
        ? "前界AB后"
        : side === "right-outside"
          ? "前AB界后"
          : tag === "code"
            ? side === "left-inside"
              ? "前界AB后"
              : "前AB界后"
            : "前A界B后";
    await check(
      `${tag} ${side} 输入落点与DOM选区`,
      plain === expected && validCaret(s) && before.domPosition === before.from && s.glyph?.height > 0,
      { before, s, expected },
    );
  }
}
for (const item of [
  { type: "link", href: "https://example.com", content: [text("AB")] },
  {
    type: "pageMention",
    props: { title: "页面", pageId: "", workspaceId: "", wikiTarget: "", notebookName: "" },
  },
]) {
  for (const side of ["left", "right"]) {
    await seed([text("前"), item, text("后")]);
    if (side === "left") await p.keyboard.press("ArrowRight");
    else {
      await p.evaluate(() => {
        window.__gooseNoteEditor.setTextCursorPosition("boundary", "end");
      });
      await p.keyboard.press("ArrowLeft");
    }
    const before = await read();
    await p.keyboard.insertText("界");
    const s = await read();
    const content = s.document[0].content,
      flat = content
        .map((x) =>
          x.type === "pageMention" ? "@" : x.type === "link" ? x.content.map((t) => t.text).join("") : x.text,
        )
        .join("");
    const middle = item.type === "link" ? "AB" : "@";
    await check(
      `${item.type} ${side} 边界`,
      flat === (side === "left" ? `前界${middle}后` : `前${middle}界后`) &&
        validCaret(s) &&
        before.domPosition === before.from,
      { before, s, flat },
    );
  }
}
for (const alignment of ["left", "center", "right", "justify"]) {
  await seed([], "paragraph", { textAlignment: alignment });
  await p.click('[data-id="boundary"] .bn-inline-content');
  const empty = await read();
  await p.keyboard.insertText("对齐");
  const s = await read();
  await check(`${alignment} 对齐空内容与输入`, validCaret(empty) && aligns(s), { empty, s });
  await p.keyboard.press("Shift+Enter");
  const br = await read();
  await p.keyboard.insertText("续");
  const next = await read();
  await check(`${alignment} 对齐软换行`, validCaret(br) && aligns(next) && next.caret.top > s.caret.top + 5, {
    br,
    next,
  });
}
const original = await p.evaluate(() => ({
  style: document.documentElement.getAttribute("style"),
  dark: document.documentElement.classList.contains("dark"),
  font: document.querySelector("main").dataset.fontFamily,
}));
try {
  for (const [dark, size, font] of [
    [false, 17, "default"],
    [true, 22, "serif"],
    [false, 14, "mono"],
  ]) {
    await p.evaluate(
      async ({ dark, size, font }) => {
        document.documentElement.classList.toggle("dark", dark);
        document.querySelector("main").dataset.fontFamily = font;
        const { applyAppearanceScaleVariables } = await import("/src/lib/appearance.ts");
        applyAppearanceScaleVariables({
          uiFontSize: dark ? 130 : 85,
          editorFontSize: size,
          editorLineHeight: 1.75,
        });
      },
      { dark, size, font },
    );
    await p.cdp("Emulation.setDeviceMetricsOverride", {
      width: 640,
      height: 640,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const long = "自动折行 光标位置 中文ABC 123 ".repeat(12);
    await seed(long);
    await p.evaluate(() => window.__gooseNoteEditor.setTextCursorPosition("boundary", "end"));
    const before = await read();
    await p.keyboard.press("Shift+Enter");
    const br = await read();
    await p.keyboard.insertText("末");
    let s = await read();
    await check(
      `${dark ? "深" : "浅"}色 ${size}px ${font} 窄窗折行和软换行`,
      aligns(s) &&
        validCaret(br) &&
        before.caret.top > before.inline.top + 30 &&
        s.caret.top > before.caret.top + 5,
      { before, br, s },
    );
    await p.keyboard.press("Home");
    await p.keyboard.press("Shift+End");
    await p.keyboard.insertText("替换");
    s = await read();
    await check(
      `${font} 换行后选区替换`,
      s.document[0].content.map((x) => x.text ?? "").join("") === long + "\n替换" && aligns(s),
      s,
    );
    await seed("const a = 1;\n\n", "codeBlock", { language: "javascript", wrap: true });
    await p.evaluate(() => window.__gooseNoteEditor.setTextCursorPosition("boundary", "end"));
    const code = await read();
    await p.keyboard.insertText("x");
    s = await read();
    await check(
      `${font} 高亮代码末尾多空行`,
      validCaret(code) && aligns(s) && Math.abs(code.caret.top - s.glyph.top) < 2,
      { code, s },
    );
    await p.keyboard.press("Tab");
    s = await read();
    await check(
      `${font} 代码Tab缩进后光标`,
      validCaret(s) &&
        s.document[0].content
          .map((x) => x.text ?? "")
          .join("")
          .endsWith("x  "),
      s,
    );
  }
} finally {
  await p.cdp("Emulation.clearDeviceMetricsOverride");
  await p.evaluate((original) => {
    if (original.style === null) document.documentElement.removeAttribute("style");
    else document.documentElement.setAttribute("style", original.style);
    document.documentElement.classList.toggle("dark", original.dark);
    document.querySelector("main").dataset.fontFamily = original.font;
  }, original);
}
await seed("中👩‍💻e\u0301عربي");
await p.evaluate(() => window.__gooseNoteEditor.setTextCursorPosition("boundary", "end"));
await p.keyboard.insertText("终");
let s = await read();
await check(
  "Unicode Emoji组合字与RTL输入落点",
  s.document[0].content.map((x) => x.text ?? "").join("") === "中👩‍💻e\u0301عربي终" && validCaret(s),
  s,
);
await p.click("textarea.page-document-title");
let title = await p.evaluate(() => {
  const e = document.activeElement;
  return {
    value: e.value,
    start: e.selectionStart,
    end: e.selectionEnd,
    placeholder: e.placeholder,
    color: getComputedStyle(e).caretColor,
    fontSize: getComputedStyle(e).fontSize,
  };
});
await check(
  "页面大标题 空提示文本和起始选区",
  title.value === "" &&
    title.start === 0 &&
    title.end === 0 &&
    title.placeholder === "新页面" &&
    title.fontSize === "40px",
  title,
);
await p.keyboard.insertText("Google 账号 Gemini");
await p.keyboard.press("ArrowLeft");
await p.keyboard.insertText("界");
await p.keyboard.press("Shift+Enter");
title = await p.evaluate(() => {
  const e = document.activeElement;
  return { value: e.value, start: e.selectionStart, end: e.selectionEnd };
});
await check(
  "页面大标题 行中输入与Shift+Enter单行契约",
  title.value === "Google 账号 Gemin界i" && title.start === 16 && title.end === 16,
  title,
);
await p.keyboard.press("Escape");
if (results.some((r) => !r.ok)) process.exitCode = 1;
