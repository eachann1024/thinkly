import { BlockNoteEditor } from "@blocknote/core";
import { editorSchema } from "@/components/editor/core/schema";
import { blockHandleCapabilities } from "@/components/editor/core/blockHandleModel";
import { convertHandleBlock } from "@/components/editor/core/blockHandleActions";
import { getCommandSlashItems, BLOCK_CONVERSIONS } from "@/components/editor/core/blocknoteCommandSlashItems";
import { createChecker } from "./lib/check";

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const allowed = new Set(["paragraph", "heading", "bulletListItem", "numberedListItem", "checkListItem", "toggleListItem", "quote", "callout"]);
  for (const type of Object.keys(editorSchema.blockSchema)) {
    const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
      { type: "heading", props: { level: 1 }, content: "标题" },
      { type, ...(type === "heading" ? { props: { level: 2 } } : {}),
        ...(type === "table" ? { content: { type: "tableContent", rows: [{ cells: ["原文", "值"] }] } }
          : editorSchema.blockSchema[type].content === "inline" ? { content: "原文" } : {}) } as any,
    ] });
    editor.focus = () => {};
    const block = editor.document[1];
    const expected = allowed.has(type);
    check(`${type} 把手转换能力符合文本类型清单`, blockHandleCapabilities(editor, block).convert === expected);
    // Only blocks with text positions can be slash-command sources.
    if (editor.schema.blockSchema[type].content === "inline") {
      editor.setTextCursorPosition(block.id, "end");
      check(`${type} 中英转换命令入口一致`, ["转换", "turn into"].every(query =>
        Boolean(getCommandSlashItems(editor, query, false)?.length) === expected));
    }
    const before = JSON.stringify(editor.document);
    const converted = convertHandleBlock(editor, block.id, BLOCK_CONVERSIONS[1], false);
    check(`${type} 实际转换执行符合能力且高级块内容不变`, expected
      ? converted && editor.getBlock(block.id)?.type === "heading"
      : !converted && JSON.stringify(editor.document) === before);
  }
  for (const language of ["javascript", "math", "mermaid"]) {
    const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
      { type: "paragraph", content: "普通正文" },
      { type: "codeBlock", props: { language }, content: "original content" },
    ] });
    editor.focus = () => {};
    editor.setTextCursorPosition(editor.document[0].id, "end");
    const cached = getCommandSlashItems(editor, "转换", false)![0];
    editor.setTextCursorPosition(editor.document[1].id, "end");
    const before = JSON.stringify(editor.document);
    cached.onItemClick();
    check(`${language} 拒绝光标切换前缓存的转换命令`, JSON.stringify(editor.document) === before &&
      !blockHandleCapabilities(editor, editor.document[1]).convert && getCommandSlashItems(editor, "转换", false)?.length === 0);
  }
  const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
    { type: "heading", props: { level: 1 }, content: "标题" }, { type: "paragraph", content: "正文" },
  ] });
  editor.focus = () => {};
  editor.setTextCursorPosition(editor.document[0].id, "end");
  check("文档标题不提供转换命令", !blockHandleCapabilities(editor, editor.document[0]).convert && getCommandSlashItems(editor, "转换", false)?.length === 0);
  editor.setTextCursorPosition(editor.document[1].id, "end");
  const cached = getCommandSlashItems(editor, "转换", false)![0];
  editor.isEditable = false;
  const before = JSON.stringify(editor.document);
  cached.onItemClick();
  check("只读模式隐藏并拦截转换", !blockHandleCapabilities(editor, editor.document[1]).convert &&
    getCommandSlashItems(editor, "转换", false)?.length === 0 && JSON.stringify(editor.document) === before);
  return checker.failed;
}
