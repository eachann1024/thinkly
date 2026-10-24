import { createExtension } from "@blocknote/core";
import { toggleMark } from "@tiptap/pm/commands";
import type { MarkType, Node as PMNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { selectionTouchesProtectedTitle } from "../utils/documentTitlePolicy";


const BLOCKED_CONTENT_TYPES = new Set(["codeBlock"]);

type BacktickKeyEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"
> &
  Partial<Pick<KeyboardEvent, "isComposing" | "keyCode" | "which" | "repeat">>;

export function isInlineCodeBacktickKeyEvent(event: BacktickKeyEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.repeat) return false;
  if (event.isComposing === true || event.keyCode === 229 || event.which === 229) {
    return false;
  }
  if (event.key === "`") return true;
  if (event.shiftKey) return false;
  if (event.key && event.key !== "Unidentified") return false;
  return (
    event.code === "Backquote" ||
    event.keyCode === 192 ||
    event.which === 192
  );
}

function getContentBlockTypeName($pos: EditorState["selection"]["$from"]): string | null {
  for (let d = $pos.depth; d >= 1; d--) {
    const node = $pos.node(d);
    if (node.type.name === "blockContainer") {
      const contentNode = d + 1 <= $pos.depth ? $pos.node(d + 1) : null;
      return contentNode?.type.name ?? null;
    }
  }
  return null;
}

export function selectionTouchesBlockedInlineCodeBlock(
  state: EditorState,
): boolean {
  if (selectionTouchesProtectedTitle(state)) return true;
  const { selection, doc } = state;
  const fromType = getContentBlockTypeName(selection.$from);
  if (fromType && BLOCKED_CONTENT_TYPES.has(fromType)) return true;
  const toType = getContentBlockTypeName(selection.$to);
  if (toType && BLOCKED_CONTENT_TYPES.has(toType)) return true;

  if (selection.empty) return false;

  let blocked = false;
  doc.nodesBetween(selection.from, selection.to, (node: PMNode, pos: number) => {
    if (blocked) return false;
    if (!node.isText) return true;
    const start = Math.max(selection.from, pos);
    const end = Math.min(selection.to, pos + node.nodeSize);
    if (start >= end) return true;
    const typeName = getContentBlockTypeName(doc.resolve(start));
    if (typeName && BLOCKED_CONTENT_TYPES.has(typeName)) {
      blocked = true;
      return false;
    }
    return true;
  });
  return blocked;
}

export function shouldToggleInlineCodeOnBacktick(
  state: EditorState,
  event: BacktickKeyEvent,
  options?: { viewComposing?: boolean },
): boolean {
  if (!isInlineCodeBacktickKeyEvent(event)) return false;
  if (options?.viewComposing) return false;
  if (state.selection.empty) return false;
  if (!state.schema.marks.code) return false;
  if (selectionTouchesBlockedInlineCodeBlock(state)) return false;
  return true;
}

export function toggleInlineCodeMarkOnRange(
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  codeMark: MarkType = state.schema.marks.code,
): boolean {
  if (!codeMark) return false;
  if (state.selection.empty) return false;
  return toggleMark(codeMark)(state, dispatch);
}

function inlineCodeBacktickWrapPlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        if (
          !shouldToggleInlineCodeOnBacktick(view.state, event, {
            viewComposing: view.composing,
          })
        ) {
          return false;
        }

        const codeMark = view.state.schema.marks.code;
        if (!codeMark) return false;

        event.preventDefault();
        return toggleInlineCodeMarkOnRange(view.state, view.dispatch.bind(view), codeMark);
      },
    },
  });
}

export const gooseInlineCodeBacktickWrapExtension = createExtension({
  key: "goose-inline-code-backtick-wrap",
  prosemirrorPlugins: [inlineCodeBacktickWrapPlugin()],
});
