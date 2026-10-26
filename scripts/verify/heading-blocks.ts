import { BlockNoteEditor, getNodeById } from "@blocknote/core";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { headingLevelForHashPrefix } from "@/components/editor/blocks/heading/headingBlockSpec";
import { BLOCK_CONVERSIONS } from "@/components/editor/core/blocknoteCommandSlashItems";
import { convertHandleBlock } from "@/components/editor/core/blockHandleActions";
import { createSlashBlockInsertion } from "@/components/editor/core/blocknoteSlashActions";
import { editorSchema } from "@/components/editor/core/schema";
import { typeSlashAtSelectedBlockStart } from "@/components/editor/extensions/blockSelectionExtension";
import { deleteSelectedBlocks } from "@/components/editor/extensions/crossBlockDeleteActions";
import { deleteEmptyLineBackward } from "@/components/editor/extensions/emptyLineDelete";
import { backspaceAtBlockStart } from "@/components/editor/extensions/emptyBlockBackspaceExtension";
import { createGooseSlashMenuReconcileExtension } from "@/components/editor/extensions/gooseSlashMenuReconcileExtension";
import { applyMarkdownBlockSpace } from "@/components/editor/inputrules/markdownInputRules";
import { shouldOpenSlashSuggestionMenu } from "@/components/editor/utils/slashMenuPolicy";
import { createChecker } from "./lib/check";

const settingsRef = { current: { defaultCodeBlockWrap: false } };
const textOf = (block: any) => Array.isArray(block?.content)
  ? block.content.map((part: any) => part?.text ?? "").join("") : "";
const paragraph = BLOCK_CONVERSIONS.find((item) => item.type === "paragraph")!;
const heading2 = BLOCK_CONVERSIONS.find((item) => item.type === "heading" && item.props?.level === 2 && !item.props.isToggleable)!;

function createEditor(content: any[]) {
  const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: content });
  editor.focus = () => {};
  return editor;
}

function withBody(second: any) {
  return createEditor([
    { type: "heading", props: { level: 1 }, content: "Title" },
    second,
    { type: "paragraph", content: "Next" },
  ]);
}

function heading(text: string, level = 2) {
  return withBody({ type: "heading", props: { level }, content: text });
}

function selectText(editor: BlockNoteEditor<any, any, any>, id: string) {
  editor.setTextCursorPosition(id, "start");
  const from = editor.prosemirrorState.selection.from;
  editor.setTextCursorPosition(id, "end");
  const to = editor.prosemirrorState.selection.from;
  editor.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, from, to)));
}

function selectBlock(editor: BlockNoteEditor<any, any, any>, id: string) {
  const node = getNodeById(id, editor.prosemirrorState.doc);
  editor.transact((tr) => tr.setSelection(NodeSelection.create(tr.doc, node!.posBeforeNode)));
}

function typeHashes(marks: string) {
  const editor = withBody({ type: "paragraph", content: marks });
  editor.setTextCursorPosition(editor.document[1], "end");
  const applied = applyMarkdownBlockSpace(editor, settingsRef as any);
  if (!applied) editor.transact((tr) => tr.insertText(" "));
  return { editor, applied };
}

export default function run() {
  const checker = createChecker();
  const { check } = checker;
  const oldWindow = globalThis.window;
  const oldRaf = globalThis.requestAnimationFrame;
  globalThis.window = { setTimeout: () => 0 } as any;
  globalThis.requestAnimationFrame = () => 0;

  const empty = heading("");
  const emptyId = empty.document[1].id;
  empty.setTextCursorPosition(emptyId, "start");
  check("空二级标题退格删掉该块", backspaceAtBlockStart(empty) && !empty.getBlock(emptyId) && textOf(empty.document[1]) === "Next");

  const byDelete = heading("");
  const deleteId = byDelete.document[1].id;
  byDelete.setTextCursorPosition(deleteId, "start");
  check("空二级标题 Delete 删掉该块", deleteEmptyLineBackward(byDelete) && !byDelete.getBlock(deleteId));

  const typed = heading("Hello");
  typed.setTextCursorPosition(typed.document[1], "start");
  check("有字二级标题在行首退格改回段落并保留文字", backspaceAtBlockStart(typed) && typed.document[1].type === "paragraph" && textOf(typed.document[1]) === "Hello");

  const menu = heading("Hello");
  check("块菜单把二级标题改回段落", convertHandleBlock(menu, menu.document[1].id, paragraph, false) && menu.document[1].type === "paragraph" && textOf(menu.document[1]) === "Hello");

  const whole = heading("Hello");
  const wholeId = whole.document[1].id;
  selectText(whole, wholeId);
  check("选中二级标题全部文字后退格删掉该块", deleteSelectedBlocks(whole) && !whole.getBlock(wholeId) && textOf(whole.document.at(-1)) === "Next");

  const node = heading("Hello");
  const nodeId = node.document[1].id;
  selectBlock(node, nodeId);
  check("整块选中后 Delete 删掉二级标题", deleteSelectedBlocks(node) && !node.getBlock(nodeId));

  const title = heading("Hello");
  selectText(title, title.document[0].id);
  check("文档标题整段选中不删标题块", !deleteSelectedBlocks(title) && title.document[0].type === "heading" && textOf(title.document[0]) === "Title");

  const kept = withBody({ type: "paragraph", content: "Hello" });
  selectText(kept, kept.document[1].id);
  check("普通段落整段选中不整块删除", !deleteSelectedBlocks(kept) && kept.document[1].type === "paragraph" && textOf(kept.document[1]) === "Hello");

  for (const [marks, level] of [["#", 1], ["##", 2], ["###", 3]] as const) {
    const { editor, applied } = typeHashes(marks);
    const block = editor.document[1];
    check(`${marks} 加空格变成 ${level} 级标题`, headingLevelForHashPrefix(marks) === level && applied && block.type === "heading" && block.props.level === level && textOf(block) === "");
  }
  for (const marks of ["####", "#####", "######"]) {
    const { editor, applied } = typeHashes(marks);
    const block = editor.document[1];
    check(`${marks} 加空格仍是带井号和空格的段落`, headingLevelForHashPrefix(marks) === null && !applied && block.type === "paragraph" && textOf(block) === `${marks} `);
  }

  const slash = withBody({ type: "paragraph", content: "Hello" });
  slash.setTextCursorPosition(slash.document[1], "start");
  check("段落块首允许打开斜杠菜单", shouldOpenSlashSuggestionMenu(slash.prosemirrorState.tr, slash, { allowSlashMenuOnFirstBlock: false }));
  const slashFrom = slash.prosemirrorState.selection.from;
  slash.transact((tr) => tr.setSelection(TextSelection.create(tr.doc, slashFrom + 2)));
  check("块中间不打开斜杠菜单", !shouldOpenSlashSuggestionMenu(slash.prosemirrorState.tr, slash, { allowSlashMenuOnFirstBlock: false }));

  const emptySlash = withBody({ type: "paragraph", content: "" });
  emptySlash.setTextCursorPosition(emptySlash.document[1], "start");
  check("空块首允许打开斜杠菜单", shouldOpenSlashSuggestionMenu(emptySlash.prosemirrorState.tr, emptySlash, { allowSlashMenuOnFirstBlock: false }));

  const headingSlash = heading("Hello");
  headingSlash.setTextCursorPosition(headingSlash.document[1], "start");
  check("标题块首允许打开斜杠菜单", shouldOpenSlashSuggestionMenu(headingSlash.prosemirrorState.tr, headingSlash, { allowSlashMenuOnFirstBlock: false }));
  headingSlash.transact((tr) => tr.insertText("/"));
  const converted = createSlashBlockInsertion(headingSlash, false)(heading2);
  check("块首斜杠把已有文字的标题改成二级标题", converted?.type === "heading" && headingSlash.document[1].props.level === 2 && textOf(headingSlash.document[1]) === "Hello");

  const selected = heading("Hello");
  selectBlock(selected, selected.document[1].id);
  check("整块选中后 / 插到块首并保留原文", typeSlashAtSelectedBlockStart(selected, "/") && textOf(selected.document[1]) === "/Hello" && selected.document[1].type === "heading");

  const editorRef: { current: BlockNoteEditor<any, any, any> | null } = { current: selected };
  selected.registerExtension(createGooseSlashMenuReconcileExtension({ current: false }, editorRef));
  const extension = selected.getExtension("goose-slash-menu-reconcile") as { prosemirrorPlugins?: { props: { handleDOMEvents?: { compositionend?: (...args: any[]) => boolean } } }[] } | undefined;
  let composed = false;
  const originalQueue = globalThis.queueMicrotask;
  globalThis.queueMicrotask = ((task: () => void) => { composed = true; task(); }) as typeof queueMicrotask;
  try { extension?.prosemirrorPlugins?.[0]?.props.handleDOMEvents?.compositionend?.({} as any, {} as any); }
  finally { globalThis.queueMicrotask = originalQueue; }
  check("输入法 compositionend 会再尝试打开斜杠菜单", composed);

  globalThis.window = oldWindow;
  globalThis.requestAnimationFrame = oldRaf;
  return checker.failed;
}
