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

/** 块选区与文字选区分离，首尾均覆盖完整容器，包含被选父块的子树。 */
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
// PM 的 JSON 注册表跨 Vite 热更新存活；复用已注册构造器，避免重复 ID 或 instanceof 分裂。
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
