import type { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { findActivePageMentionQuery, isPageMentionBoundaryChar } from "./pageMentionQuery";
export { findActivePageMentionQuery, isPageMentionBoundaryChar, mentionTriggerDeleteRange } from "./pageMentionQuery";

const SLASH_TRIGGERS = ["/", "、"] as const;

export type SlashMenuPagePolicy = {
  allowSlashMenuOnFirstBlock: boolean;
};

export function isSuggestionMenuAcceptKey(event: {
  key: string;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
}): boolean {
  if (event.key === "Enter") return !event.shiftKey;
  if (event.key !== "Tab") return false;
  return !event.shiftKey && !event.metaKey && !event.altKey && !event.ctrlKey;
}

function isCodeTextblockParent(parent: {
  type: { spec?: { code?: boolean } };
}): boolean {
  return Boolean(parent.type.spec?.code);
}

function isInsideCodeBlock($from: Transaction["selection"]["$from"]): boolean {
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === "codeBlock") return true;
  }
  return false;
}

function isCodeLikeEditorBlock(
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  try {
    return editor.getTextCursorPosition().block?.type === "codeBlock";
  } catch {
    return false;
  }
}

function hasCodeMark($from: Transaction["selection"]["$from"]): boolean {
  return $from.marks().some((mark) => mark.type.name === "code");
}

export function shouldOpenSlashSuggestionMenu(
  tr: Transaction,
  editor: BlockNoteEditor<any, any, any>,
  policy: SlashMenuPagePolicy,
): boolean {
  if (!editor.isEditable) return false;
  const $from = tr.selection.$from;
  if (!policy.allowSlashMenuOnFirstBlock) {
    const cursorBlock = editor.getTextCursorPosition().block;
    if (cursorBlock && cursorBlock.id === editor.document[0]?.id) return false;
  }
  if (!tr.selection.empty || !$from.parent.isTextblock || $from.parentOffset !== 0) return false;
  if (hasCodeMark($from)) return false;
  if (isCodeTextblockParent($from.parent) || isInsideCodeBlock($from) || isCodeLikeEditorBlock(editor)) return false;
  return !$from.parent.type.isInGroup("tableContent");
}

export function shouldOpenPageMentionSuggestionMenu(
  tr: Transaction,
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  if (!editor.isEditable) return false;
  const $from = tr.selection.$from;
  if (!$from.parent.isTextblock) return false;
  if (
    isCodeTextblockParent($from.parent) ||
    isInsideCodeBlock($from) ||
    isCodeLikeEditorBlock(editor) ||
    hasCodeMark($from)
  ) {
    return false;
  }
  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\ufffc",
  );
  const charBefore = textBefore.slice(-1);
  return isPageMentionBoundaryChar(charBefore);
}

export function reconcileSlashSuggestionMenu(
  editor: BlockNoteEditor<any, any, any>,
  policy: SlashMenuPagePolicy,
): void {
  if (!editor.isEditable) return;

  const sug = editor.getExtension(SuggestionMenu);
  if (!sug || sug.shown()) return;

  const view = editor.prosemirrorView;
  if (!view) return;
  if (view.composing) return;

  const { selection } = view.state;
  if (!selection.empty) return;

  const $from = selection.$from;
  const parent = $from.parent;
  if (!parent.isTextblock || isCodeTextblockParent(parent)) return;
  if (isInsideCodeBlock($from) || isCodeLikeEditorBlock(editor) || hasCodeMark($from)) return;
  if (parent.type.isInGroup("tableContent")) return;

  if (!policy.allowSlashMenuOnFirstBlock) {
    const cursorBlock = editor.getTextCursorPosition().block;
    if (cursorBlock && cursorBlock.id === editor.document[0]?.id) return;
  }

  const textBefore = parent.textBetween(0, $from.parentOffset, "\n", "\ufffc");
  const trigger = SLASH_TRIGGERS.find((t) => textBefore.startsWith(t));
  if (!trigger) return;
  const query = textBefore.slice(trigger.length);
  if (/[\/\\\n\ufffc、]/u.test(query)) return;

  const blockStart = $from.start();
  const caret = selection.from;
  if (caret <= blockStart) return;

  view.dispatch(
    view.state.tr.setSelection(
      TextSelection.create(view.state.doc, blockStart + trigger.length),
    ),
  );
  sug.openSuggestionMenu(trigger);
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, caret)),
  );
}

export function reconcilePageMentionSuggestionMenu(
  editor: BlockNoteEditor<any, any, any>,
): void {
  if (!editor.isEditable) return;

  const sug = editor.getExtension(SuggestionMenu);
  if (!sug || sug.shown()) return;

  const view = editor.prosemirrorView;
  if (!view) return;
  if (view.composing) return;

  const { selection } = view.state;
  if (!selection.empty) return;

  const $from = selection.$from;
  const parent = $from.parent;
  if (!parent.isTextblock || isCodeTextblockParent(parent)) return;
  if (
    isInsideCodeBlock($from) ||
    isCodeLikeEditorBlock(editor) ||
    hasCodeMark($from)
  ) {
    return;
  }

  const textBefore = parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\ufffc",
  );
  const active = findActivePageMentionQuery(textBefore);
  if (!active) return;

  const blockStart = $from.start();
  const caret = selection.from;
  const triggerPos = blockStart + active.atIndex + active.trigger.length;
  if (caret < triggerPos) return;

  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, triggerPos)),
  );
  sug.openSuggestionMenu(active.trigger);
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, caret)),
  );
}
