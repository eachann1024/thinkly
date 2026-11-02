import type { Node } from "prosemirror-model";
import { NodeSelection, Selection, TextSelection, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { GooseBlockSelection, currentBlockNode } from "./blockSelectionModel";

// Preview visibility belongs to the mounted node view, never to the saved document.
const hiddenPreviews = new WeakMap<object, Map<string, () => void>>();

export function registerHiddenCodePreview(editor: object, id: string, showSource: () => void) {
  let previews = hiddenPreviews.get(editor);
  if (!previews) {
    previews = new Map();
    hiddenPreviews.set(editor, previews);
  }
  previews.set(id, showSource);
  return () => {
    if (previews.get(id) === showSource) previews.delete(id);
  };
}

export function isHiddenCodePreview(editor: object, container: Node): boolean {
  return container.firstChild?.type.name === "codeBlock" &&
    hiddenPreviews.get(editor)?.has(container.attrs.id) === true;
}

export function normalizeHiddenCodePreviewSelection(editor: object, state: EditorState) {
  const { selection } = state;
  if (!(selection instanceof TextSelection && selection.empty) &&
    !(selection instanceof NodeSelection && selection.node.type.name === "codeBlock")) return null;
  const block = currentBlockNode(state);
  if (!block || !isHiddenCodePreview(editor, block.node)) return null;
  return state.tr.setSelection(GooseBlockSelection.create(state.doc, block.pos))
    .setMeta("addToHistory", false);
}

export function handleHiddenCodePreviewKey(editor: object, view: EditorView, event: KeyboardEvent): boolean {
  const { state } = view;
  const { selection } = state;
  if (!(selection instanceof NodeSelection) &&
    !(selection instanceof GooseBlockSelection && selection.anchorBlockPos === selection.headBlockPos)) return false;
  const block = currentBlockNode(state);
  if (!block || !isHiddenCodePreview(editor, block.node)) return false;
  if (event.key === "Enter") {
    const previews = hiddenPreviews.get(editor)!;
    const showSource = previews.get(block.node.attrs.id)!;
    // Stop normalization before moving the caret into the newly visible source.
    previews.delete(block.node.attrs.id);
    showSource();
    const end = block.pos + 2 + block.node.firstChild!.content.size;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, end)).scrollIntoView());
    view.focus();
    return true;
  }
  if (event.shiftKey) return false;
  const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 :
    ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : 0;
  if (!direction) return false;
  const boundary = direction < 0 ? block.pos : block.pos + block.node.nodeSize;
  const target = Selection.findFrom(state.doc.resolve(boundary), direction);
  if (target) view.dispatch(state.tr.setSelection(target).scrollIntoView());
  return true;
}
