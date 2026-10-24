import type { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";

type RawContentRef = { current: boolean };
const titlePolicyKey = new PluginKey<RawContentRef>("goose-document-title-policy");

export function createDocumentTitlePolicyPlugin(rawContent: RawContentRef) {
  return new Plugin({
    key: titlePolicyKey,
    state: { init: () => rawContent, apply: (_tr, value) => value },
  });
}

export function isRawEditorState(state: EditorState): boolean {
  return titlePolicyKey.getState(state)?.current ?? false;
}

export function getProtectedTitle(state: EditorState): {
  id: string;
  pos: number;
  node: PMNode;
  contentFrom: number;
  contentTo: number;
} | null {
  if (isRawEditorState(state)) return null;
  const group = state.doc.firstChild;
  const node = group?.firstChild;
  const content = node?.firstChild;
  if (
    group?.type.name !== "blockGroup" ||
    node?.type.name !== "blockContainer" ||
    content?.type.name !== "heading" ||
    Number(content.attrs.level) !== 1
  ) return null;
  return {
    id: String(node.attrs.id), pos: 1, node,
    contentFrom: 3, contentTo: 3 + content.content.size,
  };
}

export function getProtectedTitleBlockId(editor: {
  prosemirrorState: EditorState;
}): string | undefined {
  return getProtectedTitle(editor.prosemirrorState)?.id;
}

export function selectionTouchesProtectedTitle(state: EditorState): boolean {
  const title = getProtectedTitle(state);
  if (!title) return false;
  const { selection } = state;
  if (selection.empty) {
    return selection.from >= title.contentFrom && selection.from <= title.contentTo;
  }
  return selection.from < title.contentTo && selection.to > title.contentFrom;
}
