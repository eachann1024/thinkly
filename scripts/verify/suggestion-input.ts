import { BlockNoteEditor } from "@blocknote/core";
import { createChecker } from "./lib/check";
import { editorSchema } from "@/components/editor/core/schema";
import { createGooseSlashMenuReconcileExtension } from "@/components/editor/extensions/gooseSlashMenuReconcileExtension";
import {
  shouldReconcileSuggestionInput,
  isSuggestionReconcileSuppressed,
  withSuggestionReconcileSuppressed,
} from "@/components/editor/utils/suggestionInputPolicy";

Object.defineProperty(navigator, "languages", { configurable: true, value: ["zh-CN"] });

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const editorRef: { current: BlockNoteEditor<any, any, any> | null } = { current: null };
  const editor = BlockNoteEditor.create({
    schema: editorSchema,
    initialContent: [{ type: "paragraph", content: "" }],
  });
  editorRef.current = editor;
  editor.registerExtension(createGooseSlashMenuReconcileExtension({ current: true }, editorRef));

  editor.setTextCursorPosition(editor.document[0], "start");
  const state = editor.prosemirrorState;
  const atStart = state;
  const insert = (oldState: typeof state, text: string, meta?: [string, unknown]) => {
    let tr = oldState.tr.insertText(text);
    if (meta) tr = tr.setMeta(meta[0], meta[1]);
    return { tr, next: oldState.apply(tr) };
  };
  const eligible = (oldState: typeof state, text: string, meta?: [string, unknown]) => {
    const { tr, next } = insert(oldState, text, meta);
    return shouldReconcileSuggestionInput([tr], oldState, next);
  };

  check("截图原文带 + 批量插入不触发", !eligible(atStart, "3. 局部哑铃-飞鸟(大成 10kg 10+) + 练拉练拉"));
  check("原生 paste/drop 元数据屏蔽普通文本和单字符触发符", ["paste", "drop"].every((event) =>
    !eligible(atStart, "+", ["uiEvent", event]) && !eligible(atStart, "截图+文字", ["uiEvent", event])));
  check("普通单字符 @、+、[、/、、 可触发", ["@", "+", "[", "/", "、"].every((char) => eligible(atStart, char)));
  check("组合 [[ 的第二个 [ 仍作为单字符输入识别", (() => {
    const first = insert(atStart, "[").next;
    return eligible(first, "[");
  })());
  check("删除查询文本可触发", (() => {
    const populated = insert(atStart, "@abc").next;
    const tr = populated.tr.delete(populated.selection.from - 3, populated.selection.from);
    return shouldReconcileSuggestionInput([tr], populated, populated.apply(tr));
  })());
  check("IME composition 提交含触发符时可触发", eligible(atStart, "截图+文本", ["composition", 1]));
  check("截图批量内容不误判为新块输入", (() => {
    const inserted = atStart.tr.insertText("截图+文本");
    const multi = atStart.apply(inserted);
    return !shouldReconcileSuggestionInput([inserted], atStart, multi);
  })());

  const movable = BlockNoteEditor.create({ schema: editorSchema, initialContent: [
    { type: "paragraph", content: "块+内容" }, { type: "paragraph", content: "第二块" },
  ] });
  const moveState = movable.prosemirrorState;
  const firstNode = moveState.doc.child(0).child(0);
  const secondNode = moveState.doc.child(0).child(1);
  const moveTr = moveState.tr.delete(1, firstNode.nodeSize + 1).insert(1 + secondNode.nodeSize, firstNode);
  check("真实 ProseMirror 块移动不误判为单字符触发", !shouldReconcileSuggestionInput(
    [moveTr], moveState, moveState.apply(moveTr),
  ));

  const position = editor.getTextCursorPosition().block;
  editor.setTextCursorPosition(position, "start");
  const oldState = editor.prosemirrorState;
  const plugin = editor.prosemirrorState.plugins.find((candidate) => candidate.key.startsWith("goose-slash-menu-reconcile"));
  const append = plugin?.spec.appendTransaction;
  let pasteTransaction: typeof oldState.tr | undefined;
  let suppressedDuringPaste = false;
  let pasteQueued = -1;
  withSuggestionReconcileSuppressed(editor, () => {
    editor.transact((tr) => { pasteTransaction = tr.insertText("+"); });
    suppressedDuringPaste = isSuggestionReconcileSuppressed(editor);
    let queued = 0;
    const originalQueueMicrotask = globalThis.queueMicrotask;
    globalThis.queueMicrotask = (() => { queued++; }) as typeof queueMicrotask;
    try { append?.([pasteTransaction!], oldState, editor.prosemirrorState); }
    finally { globalThis.queueMicrotask = originalQueueMicrotask; }
    pasteQueued = queued;
  });
  const pastedState = editor.prosemirrorState;
  const nextTyping = pastedState.tr.insertText("中文");
  let typingQueued = 0;
  const originalQueueMicrotask = globalThis.queueMicrotask;
  globalThis.queueMicrotask = (() => { typingQueued++; }) as typeof queueMicrotask;
  try { append?.([nextTyping], pastedState, pastedState.apply(nextTyping)); }
  finally { globalThis.queueMicrotask = originalQueueMicrotask; }
  check("真实 BlockNote 同步自定义粘贴的单字符 + 被抑制，后续普通输入可恢复",
    Boolean(append) && suppressedDuringPaste && pasteQueued === 0 && !isSuggestionReconcileSuppressed(editor) &&
    typingQueued === 0 && !shouldReconcileSuggestionInput([nextTyping], pastedState, pastedState.apply(nextTyping)),
    { append: Boolean(append), suppressedDuringPaste, pasteQueued, suppressionAfter: isSuggestionReconcileSuppressed(editor), typingQueued });

  let thrown = false;
  try { withSuggestionReconcileSuppressed(editor, () => { throw new Error("expected"); }); }
  catch { thrown = true; }
  check("同步粘贴异常退出后 finally 释放 suppression", thrown && shouldReconcileSuggestionInput(
    [editor.prosemirrorState.tr.insertText("+")], editor.prosemirrorState,
    editor.prosemirrorState.apply(editor.prosemirrorState.tr.insertText("+")),
  ));
  return checker.failed;
}
