import { installCaretProbe, validCaret, aligns } from "./caret-state.mjs";
import fs from "node:fs";

const p = (await taskSpace(options.space)).page("p1");
const results = [];
function check(name, ok, state) {
  results.push({ name, ok: Boolean(ok), state });
  fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
const read = () => p.evaluate(() => window.__caretRead());
async function seed(type, props = {}) {
  await p.evaluate(
    ({ type, props }) => {
      const e = window.__gooseNoteEditor;
      e.replaceBlocks(e.document, [{ id: "layout-case", type, props, content: [] }]);
      e.setTextCursorPosition("layout-case", "start");
    },
    { type, props },
  );
  await p.click('[data-id="layout-case"] .bn-inline-content');
}
async function pseudo() {
  const { root } = await p.cdp("DOM.getDocument", { depth: 1 });
  const { nodeId } = await p.cdp("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: '[data-id="layout-case"] .bn-inline-content',
  });
  const { node } = await p.cdp("DOM.describeNode", { nodeId, depth: 1 });
  const before = node.pseudoElements?.find((n) => n.pseudoType === "before");
  const style = await p.evaluate(() => {
    const el = document.querySelector('[data-id="layout-case"] .bn-inline-content');
    const css = getComputedStyle(el, "::before");
    return { content: css.content, alignment: css.textAlign };
  });
  if (!before) return { ...style, box: null };
  const { model } = await p.cdp("DOM.getBoxModel", { backendNodeId: before.backendNodeId });
  const q = model.content;
  return { ...style, box: { left: q[0], right: q[2], top: q[1], bottom: q[5] } };
}

await p.goto(options.url);
await p.waitForSelector(".bn-editor");
await p.evaluate(installCaretProbe);
if (!options.quicknoteOnly) {
  const original = await p.evaluate(() => document.documentElement.getAttribute("style"));
  try {
    await p.evaluate(async () => {
      const { applyAppearanceScaleVariables } = await import("/src/lib/appearance.ts");
      applyAppearanceScaleVariables({ uiFontSize: 130, editorFontSize: 22, editorLineHeight: 1.75 });
    });
    for (const level of [1, 2, 3]) {
      for (const textAlignment of ["center", "right"]) {
        await seed("heading", { level, isToggleable: true, textAlignment });
        const empty = await read(),
          hint = await pseudo();
        const x = empty.inline.left + empty.inline.width * (textAlignment === "center" ? 0.5 : 1);
        check(
          `放大 H${level} ${textAlignment} 空提示与光标`,
          validCaret(empty) &&
            hint.content.length > 2 &&
            hint.alignment === textAlignment &&
            hint.box &&
            Math.abs(hint.box.left - empty.inline.left) < 2 &&
            Math.abs(hint.box.right - empty.inline.right) < 2 &&
            Math.abs(x - empty.caret.left) < 2,
          { empty, hint },
        );
        await p.keyboard.insertText("字");
        const typed = await read();
        check(
          `放大 H${level} ${textAlignment} 输入落点与基线`,
          typed.text === "字" && aligns(typed) && Math.abs(empty.caret.top - typed.firstGlyph.top) < 2,
          typed,
        );
        await p.keyboard.press("Backspace");
        const cleared = await read(),
          restored = await pseudo();
        check(
          `放大 H${level} ${textAlignment} 删空恢复`,
          cleared.text === "" &&
            validCaret(cleared) &&
            restored.content.length > 2 &&
            Math.abs(cleared.caret.left - empty.caret.left) < 2,
          { cleared, restored },
        );
      }
    }
    await seed("toggleListItem");
    const empty = await read();
    const hit = await p.evaluate(() => {
      const inline = document.querySelector('[data-id="layout-case"] .bn-inline-content');
      const button = document.querySelector('[data-id="layout-case"] .bn-toggle-button');
      const r = inline.getBoundingClientRect(),
        b = button.getBoundingClientRect();
      const target = document.elementFromPoint(r.left + Math.min(1, r.width / 2), r.top + r.height / 2);
      return { buttonRight: b.right, inlineLeft: r.left, textHit: !!target?.closest(".bn-inline-content") };
    });
    await p.keyboard.insertText("折");
    const typed = await read();
    check(
      "22px折叠列表 空行可点击且按钮不遮挡光标",
      validCaret(empty) &&
        hit.textHit &&
        hit.buttonRight <= empty.caret.left + 0.5 &&
        typed.text === "折" &&
        aligns(typed) &&
        Math.abs(empty.caret.left - typed.firstGlyph.left) < 2,
      { empty, hit, typed },
    );
  } finally {
    await p.evaluate((original) => {
      if (original === null) document.documentElement.removeAttribute("style");
      else document.documentElement.setAttribute("style", original);
    }, original);
  }
}

const quick = new URL(options.url);
quick.searchParams.set("caret-profile", "quicknote");
await p.goto(quick.href);
await p.waitForSelector(".bn-editor");
await p.evaluate(installCaretProbe);
await seed("heading", { level: 1 });
const before = await read();
check(
  "速记首H1空态 原生选区与标题字号",
  validCaret(before) &&
    before.type === "heading" &&
    before.caret.bottom - before.caret.top > parseFloat(before.fontSize) * 0.9,
  before,
);
await p.keyboard.insertText("首");
const after = await read();
check(
  "速记首H1输入后保留标题且光标跟随字形",
  after.document[0].type === "heading" &&
    after.type === "heading" &&
    after.text === "首" &&
    aligns(after) &&
    after.domPosition === after.from &&
    after.fontSize === before.fontSize &&
    Math.abs(before.caret.top - after.firstGlyph.top) < 2 &&
    Math.abs(before.caret.bottom - after.firstGlyph.bottom) < 2,
  { before, after },
);
if (results.some((r) => !r.ok)) process.exitCode = 1;
