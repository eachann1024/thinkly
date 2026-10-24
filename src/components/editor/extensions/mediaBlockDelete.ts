import { NodeSelection, TextSelection, type EditorState, type Selection, type Transaction } from "prosemirror-state";
import { getProtectedTitle } from "../utils/documentTitlePolicy";

const MEDIA_TYPES = new Set(["image", "imageResize", "video", "audio", "file"]);
export const MEDIA_KEYBOARD_DELETE_META = "goose-media-keyboard-delete";

export function isMediaNodeSelection(selection: Selection): boolean {
  if (!(selection instanceof NodeSelection)) return false;
  const node = selection.node.type.name === "blockContainer"
    ? selection.node.firstChild : selection.node;
  return MEDIA_TYPES.has(node?.type.name ?? "");
}

type MediaDeleteEditor = {
  prosemirrorState: EditorState;
  transact: (callback: (tr: Transaction) => void) => unknown;
};

export function selectAdjacentMediaForDeletion(
  editor: MediaDeleteEditor,
  direction: -1 | 1,
): boolean {
  const state = editor.prosemirrorState;
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return false;
  const { $from } = selection;
  if ($from.parent.type.name !== "paragraph" || $from.parentOffset !==
    (direction < 0 ? 0 : $from.parent.content.size)) return false;

  const depth = $from.depth - 1;
  if (depth < 1) return false;
  const container = $from.node(depth);
  if (container.type.name !== "blockContainer" || container.firstChild !== $from.parent) return false;
  const siblings = $from.node(depth - 1);
  if (siblings.type.name !== "blockGroup") return false;
  const index = $from.index(depth - 1) + direction;
  if (index < 0 || index >= siblings.childCount) return false;
  const adjacent = siblings.child(index);
  if (adjacent.type.name !== "blockContainer" || adjacent.childCount !== 1 ||
    !MEDIA_TYPES.has(adjacent.firstChild?.type.name ?? "")) return false;

  const from = $from.before(depth);
  const mediaPos = direction < 0 ? from - adjacent.nodeSize + 1 : from + container.nodeSize + 1;
  const removeEmptyLine = $from.parent.type.name === "paragraph" &&
    $from.parent.content.size === 0 && container.childCount === 1 &&
    getProtectedTitle(state)?.pos !== from;
  editor.transact((tr) => {
    tr.setMeta(MEDIA_KEYBOARD_DELETE_META, true);
    if (removeEmptyLine) tr.delete(from, from + container.nodeSize);
    tr.setSelection(NodeSelection.create(tr.doc, tr.mapping.map(mediaPos)));
    tr.scrollIntoView();
  });
  return true;
}
