import type { Page } from "@/types";
import { createExtension } from "@blocknote/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { getPageTitle } from "../utils/page-title";
import {
  findDuplicateFileTitleBlock,
  selectionAfterDuplicateTitle,
  selectionInsideDuplicateTitle,
  type DuplicateFileTitleBlock,
} from "../utils/duplicateFileTitle";

export const DUPLICATE_FILE_TITLE_CLASS = "goose-duplicate-file-title";
const duplicateFileTitleKey = new PluginKey<{ title: string | null }>("goose-duplicate-file-title");
let syncing = false;

export function duplicateFileTitleForPage(page: Page | null | undefined): string | null {
  if (!page?.localFilePath || page.isFolder) return null;
  return getPageTitle(page);
}

export function duplicateTitleBlockId(state: EditorState): string | undefined {
  const title = duplicateFileTitleKey.getState(state)?.title;
  if (!title) return undefined;
  return findDuplicateFileTitleBlock(state.doc, title)?.id;
}

function matchIn(state: EditorState): DuplicateFileTitleBlock | null {
  const title = duplicateFileTitleKey.getState(state)?.title;
  if (!title) return null;
  return findDuplicateFileTitleBlock(state.doc, title);
}

function editingKey(event: KeyboardEvent): boolean {
  return event.key.length === 1 || event.key === "Backspace" || event.key === "Delete" ||
    event.key === "Enter" || event.key === "Tab";
}

function focusPageTitle(view: EditorView): boolean {
  const title = view.dom.closest(".page-layout-document")
    ?.querySelector<HTMLTextAreaElement>("textarea.page-document-title");
  if (!title || title.readOnly) return false;
  const end = title.value.length;
  title.focus();
  title.setSelectionRange(end, end);
  return true;
}

export function syncDuplicateFileTitle(view: EditorView, title: string | null) {
  if (view.isDestroyed || syncing || !duplicateFileTitleKey.getState(view.state)) return;
  const state = view.state;
  const current = duplicateFileTitleKey.getState(state)?.title ?? null;
  const tr = state.tr;
  let changed = false;
  if (current !== title) {
    tr.setMeta(duplicateFileTitleKey, title);
    changed = true;
  }
  const match = findDuplicateFileTitleBlock(state.doc, title);
  const next = match && selectionInsideDuplicateTitle(state.selection, match)
    ? selectionAfterDuplicateTitle(state.doc, match)
    : null;
  if (next && !state.selection.eq(next)) {
    tr.setSelection(next);
    changed = true;
  }
  if (!changed) return;
  tr.setMeta("addToHistory", false);
  syncing = true;
  try { view.dispatch(tr); } finally { syncing = false; }
}

export function createDuplicateFileTitleExtension(getPage: () => Page | null | undefined) {
  let viewRef: EditorView | null = null;
  const getTitle = () => duplicateFileTitleForPage(getPage());
  return createExtension({
    key: "goose-duplicate-file-title",
    prosemirrorPlugins: [new Plugin<{ title: string | null }>({
      key: duplicateFileTitleKey,
      state: {
        init: () => ({ title: getTitle() }),
        apply: (tr, value) => {
          const meta = tr.getMeta(duplicateFileTitleKey);
          return meta === undefined ? value : { title: meta as string | null };
        },
      },
      appendTransaction: (_transactions, _old, state) => {
        if (viewRef?.composing) return null;
        const match = matchIn(state);
        if (!match || !selectionInsideDuplicateTitle(state.selection, match)) return null;
        const next = selectionAfterDuplicateTitle(state.doc, match);
        if (!next || state.selection.eq(next)) return null;
        return state.tr.setSelection(next).setMeta("addToHistory", false);
      },
      props: {
        decorations(state) {
          const match = matchIn(state);
          if (!match) return null;
          return DecorationSet.create(state.doc, [
            Decoration.node(match.pos, match.pos + match.node.nodeSize, {
              class: DUPLICATE_FILE_TITLE_CLASS,
              "aria-hidden": "true",
            }),
          ]);
        },
        handleKeyDown(view, event) {
          const match = matchIn(view.state);
          if (!match || !selectionInsideDuplicateTitle(view.state.selection, match)) return false;
          if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return false;
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            focusPageTitle(view);
            return true;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            const next = selectionAfterDuplicateTitle(view.state.doc, match);
            if (next) view.dispatch(view.state.tr.setSelection(next).setMeta("addToHistory", false));
            else focusPageTitle(view);
            return true;
          }
          return editingKey(event);
        },
        handleTextInput(view) {
          const match = matchIn(view.state);
          return Boolean(match && selectionInsideDuplicateTitle(view.state.selection, match));
        },
        handlePaste(view) {
          const match = matchIn(view.state);
          return Boolean(match && selectionInsideDuplicateTitle(view.state.selection, match));
        },
        handleClick(view, pos) {
          const match = matchIn(view.state);
          if (!match || pos <= match.pos || pos >= match.pos + match.node.nodeSize) return false;
          const next = selectionAfterDuplicateTitle(view.state.doc, match);
          if (next) view.dispatch(view.state.tr.setSelection(next).setMeta("addToHistory", false).setMeta("pointer", true));
          else focusPageTitle(view);
          return true;
        },
        handleDOMEvents: {
          beforeinput(view, event) {
            const match = matchIn(view.state);
            if (!match || !selectionInsideDuplicateTitle(view.state.selection, match)) return false;
            event.preventDefault();
            return true;
          },
        },
      },
      view(editorView) {
        viewRef = editorView;
        return {
          update(view) {
            viewRef = view;
            if (view.composing) return;
            syncDuplicateFileTitle(view, getTitle());
          },
          destroy() { viewRef = null; },
        };
      },
    })],
  });
}
