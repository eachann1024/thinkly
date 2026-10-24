import type { BlockNoteEditor } from "@blocknote/core";
import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "prosemirror-tables";
import { getProtectedTitle } from "../../utils/documentTitlePolicy";

export const NON_FORMATTABLE_TYPES = new Set([
  "image",
  "file",
  "audio",
  "video",
  "divider",
  "codeBlock",
]);
export function selectionHasNonFormattableBlock(
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  const { selection, doc } = editor.prosemirrorState;

  const nearestNonFormattable = ($pos: any) => {
    for (let d = $pos.depth; d > 0; d -= 1) {
      const node = $pos.node(d);
      if (NON_FORMATTABLE_TYPES.has(node.type.name)) return node;
    }
    return null;
  };

  const fromNode = nearestNonFormattable(selection.$from);
  if (fromNode && fromNode === nearestNonFormattable(selection.$to)) {
    return true;
  }

  if (selection.empty) return false;

  let coveredNode: any = null;
  let hasSelectedText = false;
  let entirelyNonFormattable = true;

  doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
    if (!entirelyNonFormattable) return false;
    if (!node.isText) return true;

    const selectedFrom = Math.max(selection.from, pos);
    const selectedTo = Math.min(selection.to, pos + node.nodeSize);
    if (selectedFrom >= selectedTo) return false;

    hasSelectedText = true;
    const nonFormattableNode = nearestNonFormattable(doc.resolve(selectedFrom));
    if (!nonFormattableNode) {
      entirelyNonFormattable = false;
      return false;
    }
    if (coveredNode && coveredNode !== nonFormattableNode) {
      entirelyNonFormattable = false;
      return false;
    }
    coveredNode = nonFormattableNode;
    return false;
  });

  return hasSelectedText && entirelyNonFormattable;
}

export function selectionIsEntirelyInlineCode(
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  const { selection, doc } = editor.prosemirrorState;
  if (selection.empty) return false;

  let hasSelectedText = false;
  let entirelyInlineCode = true;

  doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
    if (!entirelyInlineCode) return false;
    if (!node.isText) return true;

    const selectedFrom = Math.max(selection.from, pos);
    const selectedTo = Math.min(selection.to, pos + node.nodeSize);
    if (selectedFrom >= selectedTo) return false;

    hasSelectedText = true;
    if (!node.marks.some((mark: any) => mark.type.name === "code")) {
      entirelyInlineCode = false;
    }
    return false;
  });

  return hasSelectedText && entirelyInlineCode;
}

export function selectionDisallowsFormattingToolbar(
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  return editor.prosemirrorState.selection instanceof NodeSelection ||
    selectionHasNonFormattableBlock(editor);
}

export function selectionIsInsideFirstTitleBlock(
  editor: BlockNoteEditor<any, any, any>,
): boolean {
  const { selection } = editor.prosemirrorState;
  const firstContainer = getProtectedTitle(editor.prosemirrorState)?.node ?? null;
  if (!firstContainer) return false;

  const nearestContainer = ($pos: any) => {
    for (let d = $pos.depth; d > 0; d -= 1) {
      const node = $pos.node(d);
      if (node.type.name === "blockContainer") return node;
    }
    return null;
  };

  const fromContainer = nearestContainer(selection.$from);
  if (!fromContainer || fromContainer !== nearestContainer(selection.$to)) {
    return false;
  }
  if (fromContainer !== firstContainer) return false;

  const contentNode = fromContainer.firstChild;
  return contentNode?.type.name === "heading" && contentNode.attrs?.level === 1;
}

export function shouldRenderFormattingToolbar(
  editor: BlockNoteEditor<any, any, any>,
) {
  if (!editor.isEditable) return false;

  const { selection, doc } = editor.prosemirrorState;

  if (selection.empty || selection instanceof NodeSelection) return false;
  if (selection instanceof CellSelection) return true;
  if (doc.textBetween(selection.from, selection.to).length === 0) return false;
  if (selectionDisallowsFormattingToolbar(editor)) return false;

  return true;
}

export function isFormattingToolbarOpen({
  editable,
  suppress,
  aiActive,
  storeOpen,
  selectionAllowed,
  holdDuringPointerSelect,
}: {
  editable: boolean;
  suppress: boolean;
  aiActive: boolean;
  storeOpen: boolean;
  selectionAllowed: boolean;
  holdDuringPointerSelect: boolean;
}): boolean {
  if (!editable || suppress || aiActive) return false;
  if (holdDuringPointerSelect) return true;
  return storeOpen && selectionAllowed;
}
