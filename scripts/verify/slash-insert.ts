import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { createSlashBlockInsertion } from "@/components/editor/core/blocknoteSlashActions";
import { editorSchema } from "@/components/editor/core/schema";
import { jsonContentToMarkdown } from "@/lib/export/markdown/serialize";
import { markdownToJsonContent } from "@/lib/export/markdown/parse/block";
import { createChecker } from "./lib/check";

const text = (value: string, styles: Record<string, unknown> = {}) => ({ type: "text", text: value, styles });
const contentText = (block: any): string => typeof block?.content === "string"
  ? block.content
  : Array.isArray(block?.content) ? block.content.map((part: any) => part?.text ?? "").join("") : "";
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function createEditor(content: any[], before: any[] = []) {
  const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
    ...before,
    { type: "paragraph", content },
    { type: "paragraph", content: "相邻块保持" },
  ] });
  editor.focus = () => {};
  return editor;
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const check = checker.check;
  const oldWindow = globalThis.window;
  const oldRaf = globalThis.requestAnimationFrame;
  globalThis.window = { setTimeout: () => 0 } as any;
  globalThis.requestAnimationFrame = () => 0;
  try {
    const targets: Array<[string, any]> = [
      ["heading 1", { type: "heading", props: { level: 1, isToggleable: false, collapsed: false } }],
      ["heading 2", { type: "heading", props: { level: 2, isToggleable: false, collapsed: false } }],
      ["heading 3", { type: "heading", props: { level: 3, isToggleable: false, collapsed: false } }],
      ["bullet list", { type: "bulletListItem" }], ["numbered list", { type: "numberedListItem" }],
      ["checklist", { type: "checkListItem" }], ["quote", { type: "quote" }], ["callout", { type: "callout" }],
      ["code text", { type: "codeBlock", props: { language: "text" } }],
      ["code math", { type: "codeBlock", props: { language: "math" } }],
      ["code mermaid", { type: "codeBlock", props: { language: "mermaid" } }],
      ["divider", { type: "divider" }],
      ["table", { type: "table", content: { type: "tableContent", rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }] } }],
      ["image", { type: "image" }], ["video", { type: "video" }], ["audio", { type: "audio" }], ["file", { type: "file" }],
      ["toggle heading", { type: "heading", props: { level: 2, isToggleable: true, collapsed: false } }],
      ["toggle list", { type: "toggleListItem" }],
    ];

    for (const trigger of ["/", "、"]) {
      for (const [label, target] of targets) {
        const editor = createEditor([text(trigger + "cmd", { bold: true }), text(" 后文", { italic: true })]);
        const originalId = editor.document[0].id;
        editor.setTextCursorPosition(originalId, "start");
        const blockStart = editor.prosemirrorState.selection.from;
        editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, blockStart + trigger.length + 3)));
        const result = createSlashBlockInsertion(editor, true)(target);
        const actual = editor.document[0];
        const inlineTarget = editorSchema.blockSchema[target.type]?.content === "inline";
        check(`${trigger} 转换 ${label}：目标类型与原块 id`, result?.id === originalId && actual.id === originalId && actual.type === target.type,
          { id: actual.id, type: actual.type, target: target.type });
        check(`${trigger} 转换 ${label}：查询前缀移除`, !contentText(actual).includes("cmd") && !contentText(actual).includes(trigger), actual.content);
        if (inlineTarget) check(`${trigger} 转换 ${label}：带样式后文保留`, contentText(actual) === " 后文" && (actual.content as any[])[0]?.styles?.italic === true, actual.content);
        check(`${trigger} 转换 ${label}：相邻块不变`, editor.document.length === 2 && contentText(editor.document[1]) === "相邻块保持", editor.document.map(contentText));
        check(`${trigger} 转换 ${label}：光标在目标块`, editor.getTextCursorPosition().block.id === originalId);
        if (label === "table") {
          const selection = editor.prosemirrorState.selection;
          const parentIsTextblock = selection.$from.parent.isTextblock;
          const insideCell = Array.from({ length: selection.$from.depth }, (_, i) => selection.$from.node(i + 1).type.name)
            .some((name) => name === "tableCell" || name === "tableHeader");
          check(`${trigger} 转换 table：光标位于可编辑单元格`, selection instanceof TextSelection && parentIsTextblock && insideCell,
            { selection: selection.constructor.name, parent: selection.$from.parent.type.name, path: Array.from({ length: selection.$from.depth }, (_, i) => selection.$from.node(i + 1).type.name) });
        }
      }
    }

    const nested = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
      { type: "bulletListItem", content: [text("/cmd", { bold: true }), text(" 后文", { italic: true })], children: [
      { type: "paragraph", content: "子项" },
      { type: "image", props: { url: "/assets/child.png", name: "child.png" } },
    ] },
      { type: "paragraph", content: "相邻块保持" },
    ] });
    nested.focus = () => {};
    const source = nested.document[0];
    const childIds = source.children?.map((block: any) => block.id);
    nested.setTextCursorPosition(source, "start");
    const nestedStart = nested.prosemirrorState.selection.from;
    nested.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, nestedStart + 4)));
    createSlashBlockInsertion(nested)({ type: "heading", props: { level: 2 } });
    check("带子块的列表项改为标题仍保留子块与图片", nested.document[0]?.type === "heading" &&
      same(nested.document[0]?.children?.map((block: any) => block.id), childIds) &&
      nested.document[0]?.children?.[1]?.props?.url === "/assets/child.png", nested.document[0]);
    check("父块转换后样式正文保留", contentText(nested.document[0]) === " 后文" && nested.document[0].content[0]?.styles?.italic === true, nested.document[0].content);
    const markdown = jsonContentToMarkdown(nested.document as any);
    const reopened = markdownToJsonContent(markdown);
    check("保存重开保留后文与嵌套图片", JSON.stringify(reopened).includes(" 后文") && JSON.stringify(reopened).includes("/assets/child.png"), reopened);

    // SuggestionMenuWrapper closes the menu, then clearQuery deletes the
    // trigger/query up to the caret. Reproduce that deletion before invoking
    // the item callback: the caret returns to block start, with suffix/styles
    // and children still present.
    const clearedQuery = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
      { type: "bulletListItem", content: [text("/cmd", { bold: true }), text("尾文", { italic: true, textColor: "#d97706" })], children: [
        { type: "paragraph", content: "子项保留" },
        { type: "image", props: { url: "/assets/cleared-child.png", name: "cleared-child.png" } },
      ] },
      { type: "paragraph", content: "清理查询后的相邻块" },
    ] });
    clearedQuery.focus = () => {};
    const clearedSource = clearedQuery.document[0];
    const clearedChildren = clearedSource.children?.map((child: any) => child.id);
    clearedQuery.setTextCursorPosition(clearedSource, "start");
    const queryFrom = clearedQuery.prosemirrorState.selection.from;
    const queryTo = queryFrom + "/cmd".length;
    clearedQuery.transact((tr) => tr.delete(queryFrom, queryTo));
    check("模拟 wrapper 清理查询后光标位于块首", clearedQuery.prosemirrorState.selection.empty &&
      clearedQuery.prosemirrorState.selection.$from.parentOffset === 0 && contentText(clearedQuery.document[0]) === "尾文",
      clearedQuery.document[0]);
    const clearedTarget = createSlashBlockInsertion(clearedQuery)({ type: "heading", props: { level: 2 } });
    const convertedAfterClear = clearedQuery.document[0];
    check("已清查询词但尾文仍在时转换原块并保留带样式尾文", clearedTarget?.id === clearedSource.id &&
      convertedAfterClear.id === clearedSource.id && convertedAfterClear.type === "heading" &&
      contentText(convertedAfterClear) === "尾文" && convertedAfterClear.content?.[0]?.styles?.italic === true &&
      convertedAfterClear.content?.[0]?.styles?.textColor === "#d97706", convertedAfterClear);
    check("已清查询词后的转换仍保留嵌套子块、图片及相邻块", same(convertedAfterClear.children?.map((child: any) => child.id), clearedChildren) &&
      convertedAfterClear.children?.[1]?.props?.url === "/assets/cleared-child.png" &&
      clearedQuery.document[1]?.content?.[0]?.text === "清理查询后的相邻块", clearedQuery.document);

    const empty = createEditor([]);
    const emptyId = empty.document[0].id;
    empty.setTextCursorPosition(emptyId, "start");
    createSlashBlockInsertion(empty)({ type: "heading", props: { level: 1 } });
    check("空块转换后文档块类型正确", empty.document[0].id === emptyId && empty.document[0].type === "heading", empty.document[0]);

    const noTrigger = createEditor([text("已有正文", { bold: true })]);
    const originalText = contentText(noTrigger.document[0]);
    noTrigger.setTextCursorPosition(noTrigger.document[0], "end");
    createSlashBlockInsertion(noTrigger)({ type: "heading", props: { level: 1 } });
    check("无触发符时在后面插块并保留正文", noTrigger.document.length === 3 && noTrigger.document[0].type === "paragraph" &&
      contentText(noTrigger.document[0]) === originalText && noTrigger.document[1].type === "heading" && contentText(noTrigger.document[2]) === "相邻块保持",
      noTrigger.document.map((block: any) => ({ type: block.type, text: contentText(block) })));

    const defaultWrap = createEditor([text("/cmd")]);
    defaultWrap.setTextCursorPosition(defaultWrap.document[0], "end");
    createSlashBlockInsertion(defaultWrap, true)({ type: "codeBlock", props: { language: "text" } });
    check("代码块使用传入的默认 wrap", defaultWrap.document[0].type === "codeBlock" && defaultWrap.document[0].props.wrap === true, defaultWrap.document[0]);
    const explicitWrap = createEditor([text("/cmd")]);
    explicitWrap.setTextCursorPosition(explicitWrap.document[0], "end");
    createSlashBlockInsertion(explicitWrap, true)({ type: "codeBlock", props: { language: "text", wrap: false } });
    check("代码块保留显式 wrap=false", explicitWrap.document[0].type === "codeBlock" && explicitWrap.document[0].props.wrap === false, explicitWrap.document[0]);

    const selected = createEditor([text("正文 /cmd 后文", { bold: true })]);
    selected.setTextCursorPosition(selected.document[0], "start");
    const from = selected.prosemirrorState.selection.from;
    selected.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, from + 2, from + 8)));
    const selectedBefore = contentText(selected.document[0]);
    createSlashBlockInsertion(selected)({ type: "heading", props: { level: 2 } });
    check("非折叠选区不误删正文", contentText(selected.document[0]) === selectedBefore && selected.document.length === 3, selected.document.map(contentText));

    const beforeTrigger = createEditor([text("正文 /cmd", { bold: true })]);
    beforeTrigger.setTextCursorPosition(beforeTrigger.document[0], "start");
    const start = beforeTrigger.prosemirrorState.selection.from;
    beforeTrigger.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, start + 2)));
    const beforeText = contentText(beforeTrigger.document[0]);
    createSlashBlockInsertion(beforeTrigger)({ type: "heading", props: { level: 2 } });
    check("光标前无行首触发符时不误删", contentText(beforeTrigger.document[0]) === beforeText && beforeTrigger.document.length === 3, beforeTrigger.document.map(contentText));

    const counted = createEditor([text("/cmd")]);
    counted.setTextCursorPosition(counted.document[0], "end");
    let docChanges = 0;
    counted._tiptapEditor.on("transaction", ({ transaction }) => { if (transaction.docChanged) docChanges++; });
    createSlashBlockInsertion(counted)({ type: "heading", props: { level: 2 } });
    check("转换只产生一次文档变更", docChanges === 1, docChanges);
    console.log("  撤销未验证：headless BlockNote 未装载可用 history 扩展；请由浏览器验收");

    const linked = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
      { type: "paragraph", content: "前块保持" },
      { type: "paragraph", content: [text("/cmd"), { type: "link", href: "https://example.com", content: [text("链接后文")] }] },
      { type: "paragraph", content: "后块保持" },
    ] });
    linked.focus = () => {};
    const originalMiddleId = linked.document[1].id;
    linked.setTextCursorPosition(originalMiddleId, "start");
    const middleStart = linked.prosemirrorState.selection.from;
    linked.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, middleStart + 4)));
    createSlashBlockInsertion(linked)({ type: "heading", props: { level: 2 } });
    check("前后相邻块保持原样，链接后文留在转换块内",
      linked.document.length === 3 && linked.document[0].content?.[0]?.text === "前块保持" &&
      linked.document[1].id === originalMiddleId && linked.document[1].type === "heading" &&
      linked.document[1].content?.[0]?.type === "link" && linked.document[1].content?.[0]?.content?.[0]?.text === "链接后文" &&
      linked.document[2].content?.[0]?.text === "后块保持", linked.document);
    const linkedMarkdown = jsonContentToMarkdown(linked.document as any);
    const linkedReopened = markdownToJsonContent(linkedMarkdown);
    check("保存重开保留链接后文", JSON.stringify(linkedReopened).includes("https://example.com") && JSON.stringify(linkedReopened).includes("链接后文"), linkedReopened);
  } finally {
    globalThis.window = oldWindow;
    globalThis.requestAnimationFrame = oldRaf;
  }
  return checker.failed;
}
