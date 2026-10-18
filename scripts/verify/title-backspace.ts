import assert from "node:assert/strict";
import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { shouldBackspaceToDocumentTitle } from "../../src/components/editor/core/documentTitleNavigation";
import { isPlainDocumentNavigation } from "../../src/lib/document-title-keyboard";

let failed = false;
function verify(name: string, check: () => void) {
  try { check(); console.log(`✓ ${name}`); }
  catch (error) {
    failed = true;
    console.log(`✗ ${name}：${error instanceof Error ? error.message : String(error)}`);
  }
}
const create = (initialContent: any[]) => BlockNoteEditor.create({ initialContent });
const textOf = (block: any) => (Array.isArray(block?.content) ? block.content : [])
  .map((part: any) => typeof part === "string" ? part : part.text ?? "").join("");

verify("空正文在开头退格回到标题，文档保持空段落", () => {
  const editor = create([{ type: "paragraph" }]);
  const before = editor.document;
  editor.setTextCursorPosition(before[0], "start");
  assert.equal(shouldBackspaceToDocumentTitle(editor), true);
  assert.equal(editor.document.length, 1);
  assert.equal(editor.document[0].id, before[0].id);
  assert.equal(textOf(editor.document[0]), "");
});

verify("光标在首段文字起点退格回到标题，且不删文字", () => {
  const editor = create([{ type: "paragraph", content: "123正文" }, { type: "paragraph", content: "下一段" }]);
  const first = editor.document[0];
  editor.setTextCursorPosition(first, "start");
  assert.equal(shouldBackspaceToDocumentTitle(editor), true);
  assert.equal(textOf(editor.document[0]), "123正文");
  assert.equal(textOf(editor.document[1]), "下一段");
});

verify("正文中间、选区、后续块退格不回标题", () => {
  const editor = create([{ type: "paragraph", content: "首段" }, { type: "paragraph", content: "第二段" }]);
  const first = editor.document[0];
  editor.setTextCursorPosition(first, "start");
  const start = editor.prosemirrorState.selection.from;
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, start + 1)));
  assert.equal(shouldBackspaceToDocumentTitle(editor), false);
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, start, start + 1)));
  assert.equal(shouldBackspaceToDocumentTitle(editor), false);
  editor.setTextCursorPosition(editor.document[1], "start");
  assert.equal(shouldBackspaceToDocumentTitle(editor), false);
  assert.equal(textOf(editor.document[0]), "首段");
});

verify("空首段后面还有正文时退格不回标题", () => {
  const editor = create([{ type: "paragraph" }, { type: "paragraph", content: "还有内容" }]);
  editor.setTextCursorPosition(editor.document[0], "start");
  assert.equal(shouldBackspaceToDocumentTitle(editor), false);
  assert.equal(editor.document.length, 2);
  assert.equal(textOf(editor.document[1]), "还有内容");
});

verify("列表、标题和带子块的空段保持原来的退格", () => {
  const list = create([{ type: "bulletListItem", content: "项目" }]);
  list.setTextCursorPosition(list.document[0], "start");
  assert.equal(shouldBackspaceToDocumentTitle(list), false);
  const heading = create([{ type: "heading", props: { level: 2 }, content: "小标题" }]);
  heading.setTextCursorPosition(heading.document[0], "start");
  assert.equal(shouldBackspaceToDocumentTitle(heading), false);
  const nested = create([{ type: "paragraph", children: [{ type: "paragraph", content: "子块" }] }]);
  nested.setTextCursorPosition(nested.document[0], "start");
  assert.equal(shouldBackspaceToDocumentTitle(nested), false);
  assert.equal(textOf(nested.document[0].children[0]), "子块");
});

verify("只有属性头和空正文时退格回到标题，属性后还有正文则不跳", () => {
  const only = create([
    { type: "codeBlock", props: { language: "yaml-frontmatter" }, content: "author: example" },
    { type: "paragraph" },
  ]);
  only.setTextCursorPosition(only.document[1], "start");
  assert.equal(shouldBackspaceToDocumentTitle(only), true);
  assert.equal(only.document[0].props.language, "yaml-frontmatter");
  const more = create([
    { type: "codeBlock", props: { language: "yaml-frontmatter" }, content: "author: example" },
    { type: "paragraph" },
    { type: "paragraph", content: "正文" },
  ]);
  more.setTextCursorPosition(more.document[1], "start");
  assert.equal(shouldBackspaceToDocumentTitle(more), false);
});

verify("带修饰键或输入法的退格不跨标题边界", () => {
  const plain = { defaultPrevented: false, isComposing: false, keyCode: 8, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };
  assert.equal(isPlainDocumentNavigation(plain), true);
  for (const flag of ["defaultPrevented", "isComposing", "altKey", "ctrlKey", "metaKey", "shiftKey"])
    assert.equal(isPlainDocumentNavigation({ ...plain, [flag]: true }), false);
  assert.equal(isPlainDocumentNavigation({ ...plain, keyCode: 229 }), false);
});

export default async function run(): Promise<number> {
  return failed ? 1 : 0;
}
