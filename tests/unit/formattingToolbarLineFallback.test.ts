import { BlockNoteEditor } from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { expect, test } from "playwright/test";
import { editorSchema } from "../../src/components/editor/core/schema";
import {
  getCollapsedLineRange,
  getFixedFormattingToolbarCapabilities,
  getSelectionMarkStates,
  toggleSelectionMark,
  withPreservedSelection,
} from "../../src/components/editor/toolbars/formatting/helpers";
import { normalizeFormattingToolbarMode } from "../../src/components/editor/toolbars/formatting/toolbarMode";

function createEditor(content: any[]) {
  return BlockNoteEditor.create({ schema: editorSchema, initialContent: content });
}

function textRangeOf(editor: BlockNoteEditor<any, any, any>, text: string) {
  let found: { from: number; to: number } | null = null;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.isText && node.text?.includes(text)) {
      const from = pos + node.text.indexOf(text);
      found = { from, to: from + text.length };
      return false;
    }
    return true;
  });
  if (!found) throw new Error(`missing text: ${text}`);
  return found as { from: number; to: number };
}

function placeCursor(editor: BlockNoteEditor<any, any, any>, pos: number) {
  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, pos));
  });
}

function boldTextIn(editor: BlockNoteEditor<any, any, any>, blockId: string) {
  const block = editor.getBlock(blockId) as any;
  return (block.content as any[])
    .filter((item) => item.styles?.bold)
    .map((item) => item.text)
    .join("");
}

test("折叠光标点加粗会加粗整行，光标位置不变", () => {
  const editor = createEditor([
    { id: "p1", type: "paragraph", content: "mkdir 创建文件夹" },
    { id: "p2", type: "paragraph", content: "touch 创建文件" },
  ]);
  const { from } = textRangeOf(editor, "创建文件夹");
  placeCursor(editor, from + 1);

  toggleSelectionMark(editor, "bold");

  expect(boldTextIn(editor, "p1")).toBe("mkdir 创建文件夹");
  expect(boldTextIn(editor, "p2")).toBe("");
  expect(editor.prosemirrorState.selection.empty).toBe(true);
  expect(editor.prosemirrorState.selection.from).toBe(from + 1);
  expect(getSelectionMarkStates(editor.prosemirrorState).bold).toBe(true);

  toggleSelectionMark(editor, "bold");
  expect(boldTextIn(editor, "p1")).toBe("");
});

test("部分加粗的行显示为未加粗，点击后整行补齐", () => {
  const editor = createEditor([
    {
      id: "p1",
      type: "paragraph",
      content: [
        { type: "text", text: "粗体", styles: { bold: true } },
        { type: "text", text: "普通", styles: {} },
      ],
    },
  ]);
  placeCursor(editor, textRangeOf(editor, "粗体").from + 1);
  expect(getSelectionMarkStates(editor.prosemirrorState).bold).toBe(false);

  toggleSelectionMark(editor, "bold");
  expect(boldTextIn(editor, "p1")).toBe("粗体普通");
});

test("withPreservedSelection 在折叠光标下作用于整行", () => {
  const editor = createEditor([
    { id: "p1", type: "paragraph", content: "整行变红" },
  ]);
  const { from, to } = textRangeOf(editor, "整行变红");
  placeCursor(editor, from + 2);

  withPreservedSelection(editor, () => {
    editor.addStyles({ textColor: "red" });
  });

  const block = editor.getBlock("p1") as any;
  expect(block.content).toHaveLength(1);
  expect(block.content[0].styles.textColor).toBe("red");
  expect(editor.prosemirrorState.selection.from).toBe(from + 2);
  expect(getCollapsedLineRange(editor.prosemirrorState)).toEqual({ from, to });
});

test("空行与代码块不做整行扩展，固定工具栏能力置灰", () => {
  const editor = createEditor([
    { id: "p1", type: "paragraph", content: "" },
    { id: "c1", type: "codeBlock", content: "echo hi" },
  ]);
  const emptyPos = editor.prosemirrorState.doc.resolve(3).pos;
  placeCursor(editor, emptyPos);
  expect(getCollapsedLineRange(editor.prosemirrorState)).toBeNull();
  const emptyCaps = getFixedFormattingToolbarCapabilities(editor);
  expect(emptyCaps.showMarks).toBe(true);
  expect(emptyCaps.showLink).toBe(false);

  placeCursor(editor, textRangeOf(editor, "echo hi").from + 1);
  expect(getCollapsedLineRange(editor.prosemirrorState)).toBeNull();
  const codeCaps = getFixedFormattingToolbarCapabilities(editor);
  expect(codeCaps.showMarks).toBe(false);
  expect(codeCaps.showColors).toBe(false);
});

test("非法的工具栏模式回退为跟随选区", () => {
  expect(normalizeFormattingToolbarMode("top-bar")).toBe("top-bar");
  expect(normalizeFormattingToolbarMode("unknown")).toBe("floating");
  expect(normalizeFormattingToolbarMode(undefined)).toBe("floating");
});
