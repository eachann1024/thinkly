import assert from "node:assert/strict";
import { BlockNoteEditor } from "@blocknote/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { history } from "@tiptap/pm/history";
import { enterFirstBodyParagraph, canReturnToDocumentTitle } from "../../src/components/editor/core/documentTitleNavigation";
import { isPlainDocumentNavigation } from "../../src/lib/document-title-keyboard";

Object.defineProperty(navigator, "languages", { configurable: true, value: ["zh-CN"] });
const { jsonContentToMarkdown } = await import("../../src/lib/export/markdown/serialize");
const { markdownToJsonContent } = await import("../../src/lib/export/markdown/parse/block");
const { encodeLocalBlockPropsWrappers } = await import("../../src/lib/export/markdown/localBlockPropsWrappers");

let failed = false;
function verify(name: string, check: () => void) {
  try { check(); console.log(`✓ ${name}`); }
  catch (error) {
    failed = true;
    console.log(`✗ ${name}：${error instanceof Error ? error.message : String(error)}`);
  }
}
const create = (initialContent: any[]) => {
  const editor = BlockNoteEditor.create({ initialContent });
  editor.prosemirrorView.updateState(editor.prosemirrorState.reconfigure({ plugins: [history()] }));
  return editor;
};
const textOf = (content: any[]) => content.map((part) => typeof part === "string" ? part : part.text ?? "").join("");

verify("标题回车保留原标题块、样式和子树，进入新首段且支持单步撤销/重做", () => {
  const editor = create([{ type: "heading", props: { level: 2 }, content: [{ type: "text", text: "正文", styles: { bold: true } }], children: [{ type: "paragraph", content: "子块" }] }]);
  const before = editor.document;
  assert(enterFirstBodyParagraph(editor));
  assert.equal(editor.document[0].type, "paragraph");
  assert.deepEqual(editor.document.slice(1), before);
  assert.equal(editor.getTextCursorPosition().block.id, editor.document[0].id);
  assert(canReturnToDocumentTitle(editor));
  assert(editor.undo());
  assert.deepEqual(editor.document, before);
  assert(editor.redo());
  assert.deepEqual(editor.document.slice(1), before);
});

verify("空正文及已有空首段复用；带子块的空父段保持原结构", () => {
  const editor = create([{ type: "paragraph" }]);
  const id = editor.document[0].id;
  enterFirstBodyParagraph(editor);
  enterFirstBodyParagraph(editor);
  assert.equal(editor.document.length, 1);
  assert.equal(editor.document[0].id, id);
  const parent = create([{ type: "paragraph", children: [{ type: "paragraph", content: "子块" }] }]);
  const before = parent.document;
  enterFirstBodyParagraph(parent);
  assert.deepEqual(parent.document.slice(1), before);
});

verify("仅正文首块文字起点返回标题，正文中间/后续块/选区/子块不跳转", () => {
  const editor = create([{ type: "paragraph", content: "首段", children: [{ type: "paragraph", content: "子块" }] }, { type: "paragraph", content: "第二段" }]);
  const first = editor.document[0];
  editor.setTextCursorPosition(first, "start");
  assert(canReturnToDocumentTitle(editor));
  const start = editor.prosemirrorState.selection.from;
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, start + 1)));
  assert(!canReturnToDocumentTitle(editor));
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, start, start + 1)));
  assert(!canReturnToDocumentTitle(editor));
  editor.transact((tr) => tr.setSelection(NodeSelection.create(tr.doc, 1)));
  assert(!canReturnToDocumentTitle(editor));
  editor.setTextCursorPosition(editor.document[1], "start");
  assert(!canReturnToDocumentTitle(editor));
  editor.setTextCursorPosition(first.children[0], "start");
  assert(!canReturnToDocumentTitle(editor));
});

verify("表格/图片/代码首块保持原内容；回车提供普通首段而不进入特殊块", () => {
  for (const block of [
    { type: "table", content: { type: "tableContent", rows: [{ cells: ["单元格"] }] } },
    { type: "image", props: { url: "https://example.com/a.png" } },
    { type: "codeBlock", content: "const value = 1;" },
  ]) {
    const editor = create([block]);
    const before = editor.document;
    editor.setTextCursorPosition(before[0], "start");
    assert(!canReturnToDocumentTitle(editor));
    enterFirstBodyParagraph(editor);
    assert.deepEqual(editor.document.slice(1), before);
    assert(canReturnToDocumentTitle(editor));
  }
});

verify("输入法及 Shift/Ctrl/Alt/Meta 和已处理事件保留原有行为", () => {
  const plain = { defaultPrevented: false, isComposing: false, keyCode: 13, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };
  assert(isPlainDocumentNavigation(plain));
  for (const flag of ["defaultPrevented", "isComposing", "altKey", "ctrlKey", "metaKey", "shiftKey"])
    assert(!isPlainDocumentNavigation({ ...plain, [flag]: true }));
  assert(!isPlainDocumentNavigation({ ...plain, keyCode: 229 }));
});

verify("本地空首段保存重读保留，普通导出沿用原格式，空文件不注入标题", () => {
  const blocks = [{ type: "paragraph", content: [] }, { type: "heading", props: { level: 2 }, content: "正文" }];
  const local = jsonContentToMarkdown(encodeLocalBlockPropsWrappers(blocks as any, { preserveEmptyParagraphs: true }));
  const restored = markdownToJsonContent(local);
  assert.equal(restored[0].type, "paragraph");
  assert.equal(restored[1].type, "heading");
  assert.equal(textOf(restored[1].content), "正文");
  assert.equal(jsonContentToMarkdown(blocks as any), "## 正文");
  assert.equal(jsonContentToMarkdown(encodeLocalBlockPropsWrappers([blocks[0]] as any)), "");
});

verify("首段插在分栏外，Markdown 重读保留分栏子树与代码中的字面标记", () => {
  const blocks: any[] = [{ type: "paragraph", content: [] }, { type: "columnLayout", children: [
    { type: "columnSection", props: { width: 50 }, children: [{ type: "paragraph", content: "左栏" }] },
    { type: "columnSection", props: { width: 50 }, children: [{ type: "paragraph", content: "右栏" }] },
  ] }, { type: "codeBlock", props: { language: "text" }, content: "<!-- goose-note:empty-block=paragraph -->" }];
  const restored = markdownToJsonContent(jsonContentToMarkdown(encodeLocalBlockPropsWrappers(blocks, { preserveEmptyParagraphs: true })));
  assert.equal(restored[0].type, "paragraph");
  assert.equal(restored[1].type, "columnLayout");
  assert.equal(restored[1].children.length, 2);
  assert.equal(textOf(restored[1].children[0].children[0].content), "左栏");
  assert.equal(textOf(restored[1].children[1].children[0].content), "右栏");
  assert.equal(restored[2].type, "codeBlock");
});

verify("YAML 属性留在文件头，空段进入正文且保存重读不重复/降级属性", () => {
  for (const body of [[], [{ type: "heading", content: "正文" }]]) {
    const editor = create([{ type: "codeBlock", props: { language: "yaml-frontmatter" }, content: "author: example" }, ...body]);
    const header = editor.document[0];
    enterFirstBodyParagraph(editor);
    assert.deepEqual(editor.document[0], header);
    assert.equal(editor.document[1].type, "paragraph");
    assert(canReturnToDocumentTitle(editor));
    const markdown = jsonContentToMarkdown(encodeLocalBlockPropsWrappers(editor.document, { preserveEmptyParagraphs: true }));
    assert(markdown.startsWith("---\nauthor: example\n---"));
    const restored = markdownToJsonContent(markdown);
    assert.equal(restored[0].props.language, "yaml-frontmatter");
    assert.equal(restored[1].type, "paragraph");
  }
});

export default async function run(): Promise<number> {
  return failed ? 1 : 0;
}
