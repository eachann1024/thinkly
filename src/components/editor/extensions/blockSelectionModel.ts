import { Fragment, Slice, type Node as PMNode, type ResolvedPos } from "prosemirror-model";
import {
  Selection, SelectionRange, NodeSelection,
  type SelectionBookmark, type EditorState,
} from "prosemirror-state";
import type { Mappable } from "prosemirror-transform";

export type SelectedBlockNode = { node: PMNode; pos: number };

export function blockNodeAt(doc: PMNode, pos: number): SelectedBlockNode | null {
  const node = doc.nodeAt(pos);
  return node?.type.name === "blockContainer" ? { node, pos } : null;
}

function enclosingBlock($pos: ResolvedPos): SelectedBlockNode | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === "blockContainer") {
      return { node: $pos.node(depth), pos: $pos.before(depth) };
    }
  }
  return blockNodeAt($pos.doc, $pos.pos);
}

export function currentBlockNode(state: EditorState): SelectedBlockNode | null {
  if (state.selection instanceof GooseBlockSelection) {
    return blockNodeAt(state.doc, state.selection.headBlockPos);
  }
  if (state.selection instanceof NodeSelection) {
    if (state.selection.node.type.name === "blockContainer") {
      return { node: state.selection.node, pos: state.selection.from };
    }
    return enclosingBlock(state.selection.$from);
  }
  return enclosingBlock(state.selection.$head) ??
    enclosingBlock(state.doc.resolve(Math.max(0, state.selection.to - 1))) ??
    blockNodeAt(state.doc, 1);
}

function lastBlockInside(node: PMNode, pos: number): SelectedBlockNode | null {
  if (node.type.name === "blockContainer") {
    let cursor = pos + 1;
    let nested: SelectedBlockNode | null = null;
    for (let i = 0; i < node.childCount; i += 1) {
      const child = node.child(i);
      if (child.type.name === "blockGroup") nested = lastBlockInside(child, cursor);
      cursor += child.nodeSize;
    }
    return nested ?? { node, pos };
  }
  if (node.type.name !== "blockGroup") return null;
  let cursor = pos + 1;
  let last: SelectedBlockNode | null = null;
  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    if (child.type.name === "blockContainer") last = lastBlockInside(child, cursor);
    cursor += child.nodeSize;
  }
  return last;
}

export function adjacentBlock(
  doc: PMNode,
  pos: number,
  size: number,
  direction: 1 | -1,
): SelectedBlockNode | null {
  if (direction > 0) {
    const after = pos + size;
    if (after > doc.content.size) return null;
    const $after = doc.resolve(after);
    const next = $after.nodeAfter;
    if (next?.type.name === "blockContainer") return { node: next, pos: after };
    for (let depth = $after.depth; depth > 0; depth -= 1) {
      if ($after.node(depth).type.name !== "blockContainer") continue;
      return adjacentBlock(doc, $after.before(depth), $after.node(depth).nodeSize, 1);
    }
    return null;
  }
  const $pos = doc.resolve(pos);
  const before = $pos.nodeBefore;
  if (before?.type.name === "blockContainer") {
    return lastBlockInside(before, pos - before.nodeSize);
  }
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name !== "blockContainer") continue;
    return adjacentBlock(doc, $pos.before(depth), $pos.node(depth).nodeSize, -1);
  }
  return null;
}

export function findBlockPositions(doc: PMNode, ids: ReadonlySet<string>): Map<string, number> {
  const found = new Map<string, number>();
  const visit = (node: PMNode, pos: number): boolean => {
    if (found.size >= ids.size) return true;
    if (node.type.name === "blockContainer") {
      const id = node.attrs?.id;
      if (typeof id === "string" && ids.has(id)) found.set(id, pos);
      let cursor = pos + 1;
      for (let index = 0; index < node.childCount; index += 1) {
        const child = node.child(index);
        if (child.type.name === "blockGroup" && visit(child, cursor)) return true;
        cursor += child.nodeSize;
      }
      return found.size >= ids.size;
    }
    if (node.type.name !== "blockGroup" && node.type.name !== "doc") return false;
    let cursor = node.type.name === "doc" ? 0 : pos + 1;
    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      if (visit(child, cursor)) return true;
      cursor += child.nodeSize;
    }
    return found.size >= ids.size;
  };
  visit(doc, 0);
  return found;
}

export function selectedBlockRoots(state: Pick<EditorState, "doc" | "selection">): SelectedBlockNode[] {
  const { from, to } = state.selection;
  const roots: SelectedBlockNode[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== "blockContainer") return true;
    if (pos < from || pos + node.nodeSize > to) return true;
    roots.push({ node, pos });
    return false;
  });
  return roots;
}

function blockBookmark(anchor: number, head: number): SelectionBookmark {
  return {
    map: (mapping) => blockBookmark(mapping.map(anchor), mapping.map(head)),
    resolve: (doc) => {
      if (blockNodeAt(doc, anchor) && blockNodeAt(doc, head)) {
        return GooseBlockSelection.create(doc, anchor, head);
      }
      return Selection.near(doc.resolve(Math.max(0, Math.min(anchor, doc.content.size))));
    },
  };
}

class GooseBlockSelectionImpl extends Selection {
  readonly anchorBlockPos: number;
  readonly headBlockPos: number;

  constructor(
    anchorBlockPos: number,
    headBlockPos: number,
    doc: PMNode,
  ) {
    const anchor = blockNodeAt(doc, anchorBlockPos);
    const head = blockNodeAt(doc, headBlockPos);
    if (!anchor || !head) throw new RangeError("Invalid block selection");
    const from = Math.min(anchor.pos, head.pos);
    const to = Math.max(anchor.pos + anchor.node.nodeSize, head.pos + head.node.nodeSize);
    super(doc.resolve(anchor.pos), doc.resolve(head.pos), [
      new SelectionRange(doc.resolve(from), doc.resolve(to)),
    ]);
    this.anchorBlockPos = anchorBlockPos;
    this.headBlockPos = headBlockPos;
  }

  static create(doc: PMNode, anchor: number, head = anchor) {
    return new GooseBlockSelection(anchor, head, doc);
  }

  content(): Slice {
    const state = { doc: this.$from.doc, selection: this };
    return new Slice(Fragment.from(selectedBlockRoots(state).map(({ node }) => node)), 0, 0);
  }

  eq(other: Selection): boolean {
    return other instanceof GooseBlockSelection &&
      other.anchorBlockPos === this.anchorBlockPos && other.headBlockPos === this.headBlockPos;
  }

  map(doc: PMNode, mapping: Mappable): Selection {
    return this.getBookmark().map(mapping).resolve(doc);
  }

  getBookmark(): SelectionBookmark {
    return blockBookmark(this.anchorBlockPos, this.headBlockPos);
  }

  toJSON() {
    return { type: "goose-block", anchor: this.anchorBlockPos, head: this.headBlockPos };
  }

  static fromJSON(doc: PMNode, json: { anchor: number; head: number }) {
    return GooseBlockSelection.create(doc, json.anchor, json.head);
  }
}
GooseBlockSelectionImpl.prototype.visible = false;
const previousClass = import.meta.hot?.data.gooseBlockSelectionClass as typeof GooseBlockSelectionImpl | undefined;
export const GooseBlockSelection = previousClass ?? GooseBlockSelectionImpl;
if (!previousClass) Selection.jsonID("goose-block", GooseBlockSelection);
if (import.meta.hot) {
  import.meta.hot.data.gooseBlockSelectionClass = GooseBlockSelection;
  import.meta.hot.accept(() => import.meta.hot?.invalidate("块选区模型已更新"));
}

export function isBlockNodeSelection(state: EditorState): boolean {
  return state.selection instanceof GooseBlockSelection ||
    (state.selection instanceof NodeSelection &&
      (state.selection.node.type.name === "blockContainer" ||
        state.selection.node.type.spec.group === "blockContent"));
}
