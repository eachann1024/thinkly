import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { GooseBlockSelection, selectedBlockRoots } from "@/components/editor/extensions/blockSelectionModel";
import { editorViewForTarget } from "@/components/editor/extensions/tableWindowExtension";
import { markBlockHandleDrag } from "@/lib/editor-split/blockHandleDrag";

type PendingDrag = {
  view: EditorView;
  ids: string[];
  slice: Slice;
  node?: NodeSelection;
};

let pending: PendingDrag | null = null;
let ghost: HTMLElement | null = null;
let listening = false;

function findBlock(doc: PMNode, id: string): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (found || node.type.spec.tableRole) return false;
    if (node.type.name === "blockContainer" && String(node.attrs.id ?? "") === id) {
      found = { node, pos };
      return false;
    }
  });
  return found;
}

function blockIsHeavy(node: PMNode): boolean {
  const content = node.type.name === "blockContainer" ? node.firstChild : node;
  if (content?.type.spec.tableRole === "table") return content.childCount >= 48;
  if ((content?.textContent.length ?? 0) > 20000) return true;
  return node.nodeSize > 8000;
}

function editorIsHeavy(doc: PMNode): boolean {
  if (doc.nodeSize > 12000 || (doc.firstChild?.childCount ?? 0) > 80) return true;
  let heavy = false;
  doc.descendants((node) => {
    if (heavy || node.type.spec.tableRole === "table") {
      if (node.type.spec.tableRole === "table" && node.childCount >= 48) heavy = true;
      return false;
    }
    if (node.type.spec.tableRole) return false;
  });
  return heavy;
}

function installDragBridge() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("dragover", (event) => {
    if (!pending) return;
    const editor = event.target instanceof Element ? event.target.closest(".bn-editor") : null;
    if (!editor || editor === pending.view.dom) return;
    const view = editorViewForTarget(event.target);
    if (!view || view.dragging) return;
    view.dragging = { slice: pending.slice, move: false } as EditorView["dragging"];
  }, true);
  document.addEventListener("drop", (event) => {
    const drag = pending;
    if (!drag || event.altKey) return;
    const editor = event.target instanceof Element ? event.target.closest(".bn-editor") : null;
    if (!editor || editor === drag.view.dom) return;
    const view = editorViewForTarget(event.target);
    if (view && !view.dragging) {
      view.dragging = { slice: drag.slice, move: false } as EditorView["dragging"];
    }
  }, true);
  document.addEventListener("dragend", () => {
    pending = null;
    ghost?.remove();
    ghost = null;
  });
}

/** 大表 / 大块拖动不再克隆和序列化整份 DOM。返回 false 时走原来的拖拽。 */
export function startHeavyBlockDrag(view: EditorView, data: DataTransfer, blockId: string): boolean {
  const found = findBlock(view.state.doc, blockId);
  if (!found) return false;
  const selection = view.state.selection;
  const multi = selection instanceof GooseBlockSelection
    && selection.from <= found.pos
    && selection.to >= found.pos + found.node.nodeSize;
  const heavy = multi
    ? selectedBlockRoots(view.state).some(({ node }) => blockIsHeavy(node)) || selection.to - selection.from > 8000
    : blockIsHeavy(found.node);
  if (!heavy && !editorIsHeavy(view.state.doc)) return false;

  installDragBridge();
  const slice = multi ? selection.content() : new Slice(Fragment.from(found.node), 0, 0);
  const node = multi ? undefined : NodeSelection.create(view.state.doc, found.pos);
  if (node) view.dispatch(view.state.tr.setSelection(node).setMeta("addToHistory", false));
  const ids = multi
    ? selectedBlockRoots(view.state).map(({ node }) => String(node.attrs.id ?? "")).filter(Boolean)
    : [blockId];
  view.dragging = { slice, move: true, node } as EditorView["dragging"];
  pending = { view, ids, slice, node };
  data.effectAllowed = "move";
  data.setData("text/plain", (found.node.textContent || " ").slice(0, 80));
  markBlockHandleDrag(data);
  ghost?.remove();
  const preview = !blockIsHeavy(found.node) ? view.nodeDOM(found.pos) : null;
  if (preview instanceof HTMLElement) {
    ghost = preview.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.top = "-1000px";
    ghost.style.maxWidth = "240px";
    ghost.style.maxHeight = "72px";
    ghost.style.overflow = "hidden";
    ghost.style.pointerEvents = "none";
  } else {
    ghost = document.createElement("div");
    ghost.className = "goose-drag-ghost";
  }
  document.body.appendChild(ghost);
  data.setDragImage(ghost, 12, 16);
  return true;
}

export function blockDragIsHeavy(node: PMNode): boolean {
  return blockIsHeavy(node);
}
