import { installCaretProbe, validCaret } from "./caret-state.mjs";
import fs from "node:fs";

const task = await taskSpace(options.space);
const page = task.page("p1");
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
const profiles = options.profile ? [options.profile] : ["note", "quicknote"];
const result = [];
const cases = variants.slice(options.start ?? 0, options.end ?? variants.length);

function record(name, ok, state) {
  const entry = {
    name,
    ok: Boolean(ok),
    geometry: {
      caret: state?.state?.caret ?? null,
      computedPseudo: state?.state?.pseudo ?? null,
      cdpPseudo: state?.pseudo ?? null,
      box: state?.box ?? null,
      focus: state?.state?.focus ?? null,
    },
    ...(!ok ? { diagnostic: state } : {}),
  };
  result.push(entry);
  fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` ${JSON.stringify(state)}`}`);
}

function expectsTextPlaceholder(type, profile) {
  if (type === "codeBlock" || type === "toggleListItem" || type === "callout") return false;
  if (type === "paragraph" && profile === "quicknote") return false;
  return true;
}

async function pseudoState() {
  const state = await page.evaluate(() => window.__caretRead());
  const document = await page.cdp("DOM.getDocument", { depth: 1, pierce: true });
  const targetBlock = state.document?.find((block) => block.id === "caret-case");
  const toggleHeading = state.type === "heading" && targetBlock?.props?.isToggleable;
  const selector = toggleHeading
    ? '[data-id="caret-case"] .bn-block-content[data-content-type="heading"] .bn-inline-content'
    : '[data-id="caret-case"] .bn-block-content[data-content-type]';
  const target = await page.cdp("DOM.querySelector", {
    nodeId: document.root.nodeId,
    selector,
  });
  if (!target.nodeId) return { state, pseudo: null, box: null };
  const pseudoType = toggleHeading ? "before" : "after";
  const described = await page.cdp("DOM.describeNode", { nodeId: target.nodeId, depth: 1 });
  const pseudo = described.node.pseudoElements?.find((node) => node.pseudoType === pseudoType);
  const computed = await page.evaluate(({ selector, pseudoType }) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element, `::${pseudoType}`);
    return { content: style.content, display: style.display };
  }, { selector, pseudoType });
  if (!pseudo) return { state, pseudo: computed, box: null };
  try {
    const { model } = await page.cdp("DOM.getBoxModel", { backendNodeId: pseudo.backendNodeId });
    const quad = model.content;
    const xs = [quad[0], quad[2], quad[4], quad[6]];
    const ys = [quad[1], quad[3], quad[5], quad[7]];
    return {
      state,
      pseudo: { ...computed, nodeName: pseudo.nodeName, pseudoType },
      box: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) },
    };
  } catch (error) {
    return { state, pseudo: { ...computed, nodeName: pseudo.nodeName, pseudoType }, boxError: String(error) };
  }
}

function hasVisiblePlaceholder(sample) {
  const content = sample.pseudo?.content;
  const visibleText = typeof content === "string" && content.length > 2 && content !== '""';
  return visibleText && sample.box && sample.box.right > sample.box.left && sample.box.bottom > sample.box.top;
}

function hasNoVisiblePlaceholder(sample) {
  const content = sample.pseudo?.content;
  return Boolean(!content || content === '""' || content === "none" || content === "normal" ||
    sample.pseudo?.display === "none" || !sample.box ||
    sample.box.right <= sample.box.left || sample.box.bottom <= sample.box.top);
}

function alignsWithCaret(sample) {
  if (!sample.box || !validCaret(sample.state)) return false;
  const caret = sample.state.caret;
  const height = sample.box.bottom - sample.box.top;
  const centeredTop = sample.box.top + Math.max(0, (height - (caret.bottom - caret.top)) / 2);
  // The quote has an intentional inset; compare its actual text start with PM's caret
  // while allowing the quote's border/padding, rather than comparing to the block edge.
  const quote = sample.state.type === "quote";
  const leftDelta = Math.abs(sample.box.left - caret.left);
  return leftDelta <= (quote ? 6 : 3) && Math.abs(centeredTop - caret.top) <= 3;
}

for (const profile of profiles) {
  const url = new URL(options.url);
  if (profile === "quicknote") url.searchParams.set("caret-profile", "quicknote");
  else url.searchParams.delete("caret-profile");
  await page.goto(url.href);
  await page.waitForSelector(".bn-editor");
  await page.evaluate(installCaretProbe);

  for (const [type, props = {}] of cases) {
    const name = `${profile} ${type}${JSON.stringify(props)}`;
    const quicknoteHeading = profile === "quicknote" && type === "heading";
    await page.evaluate(({ type, props, quicknoteHeading }) => {
      const editor = window.__gooseNoteEditor;
      const blocks = quicknoteHeading
        ? [
            { id: "caret-prefix", type: "paragraph", content: "前置段落" },
            { id: "caret-case", type, props, content: [] },
          ]
        : [{ id: "caret-case", type, props, content: [] }];
      editor.replaceBlocks(editor.document, blocks);
      editor.setTextCursorPosition("caret-case", "start");
    }, { type, props, quicknoteHeading });
    await page.waitForSelector('[data-id="caret-case"] .bn-inline-content');
    await page.click('[data-id="caret-case"] .bn-inline-content');

    const expected = expectsTextPlaceholder(type, profile);
    const focusedEmpty = await pseudoState();
    record(`${name} focused 空块占位`,
      focusedEmpty.state.id === "caret-case" && validCaret(focusedEmpty.state) &&
      (expected ? hasVisiblePlaceholder(focusedEmpty) : hasNoVisiblePlaceholder(focusedEmpty)),
      focusedEmpty);
    if (expected) {
      record(`${name} 占位起点/垂直基线与空 caret 对齐`, alignsWithCaret(focusedEmpty), focusedEmpty);
    }

    await page.keyboard.insertText("X");
    const typed = await pseudoState();
    record(`${name} 输入后占位隐藏`, typed.state.text === "X" && hasNoVisiblePlaceholder(typed), typed);

    await page.keyboard.press("Backspace");
    const deleted = await pseudoState();
    record(`${name} 删空后占位恢复`, deleted.state.text === "" && validCaret(deleted.state) &&
      (expected ? hasVisiblePlaceholder(deleted) : hasNoVisiblePlaceholder(deleted)), deleted);

    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForFunction(() => !window.__gooseNoteEditor.prosemirrorView.hasFocus());
    const blurred = await pseudoState();
    record(`${name} 失焦后占位隐藏`, hasNoVisiblePlaceholder(blurred), blurred);

    await page.click('[data-id="caret-case"] .bn-inline-content');
    const refocused = await pseudoState();
    record(`${name} 重聚焦后占位恢复`, validCaret(refocused.state) &&
      (expected ? hasVisiblePlaceholder(refocused) : hasNoVisiblePlaceholder(refocused)), refocused);
  }
}

if (result.some((item) => !item.ok)) process.exitCode = 1;
