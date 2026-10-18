import { createSplitNodeId, normalizeSizes, walkLeaves } from "./treePrimitives";
import type { SplitGroup, SplitLeaf, SplitNode, SplitState } from "./types";

export type LayoutPresetName = "columns" | "rows" | "grid";

export type SplitNodeIds = {
  leaf: () => string;
  group: () => string;
};

export type LayoutPresetResult = {
  state: SplitState;
  /** 多出来的格子按视觉顺序关掉后留下的笔记；笔记本身不删。 */
  droppedPageIds: string[];
};

export function presetPaneCount(preset: LayoutPresetName): number {
  return preset === "grid" ? MAX_PRESET_PANES : 2;
}

const MAX_PRESET_PANES = 4;

function defaultIds(): SplitNodeIds {
  return {
    leaf: () => createSplitNodeId("leaf"),
    group: () => createSplitNodeId("group"),
  };
}

function leafFrom(slot: SplitLeaf): SplitLeaf {
  return slot.title
    ? { kind: "leaf", id: slot.id, pageId: slot.pageId, title: slot.title }
    : { kind: "leaf", id: slot.id, pageId: slot.pageId };
}

function group(
  ids: SplitNodeIds,
  orientation: SplitGroup["orientation"],
  children: SplitNode[],
): SplitGroup {
  return {
    kind: "group",
    id: ids.group(),
    orientation,
    children,
    sizes: normalizeSizes(children.map(() => 1), children.length),
  };
}

/**
 * 四宫格按阅读顺序排：上左、上右、下左、下右。
 * 先走上面那条横向组，walkLeaves 的顺序才和原来的格子顺序一致。
 */
function buildRoot(preset: LayoutPresetName, slots: SplitLeaf[], ids: SplitNodeIds): SplitNode {
  if (preset === "columns") return group(ids, "horizontal", slots.map(leafFrom));
  if (preset === "rows") return group(ids, "vertical", slots.map(leafFrom));
  return group(ids, "vertical", [
    group(ids, "horizontal", slots.slice(0, 2).map(leafFrom)),
    group(ids, "horizontal", slots.slice(2, 4).map(leafFrom)),
  ]);
}

function layoutShapeKey(node: SplitNode): string {
  if (node.kind === "leaf") return `l:${node.id}:${node.pageId}`;
  const sizes = node.sizes.map((size) => String(Math.round(size * 10000) / 10000)).join(",");
  return `g:${node.orientation}:${sizes}:${node.children.map(layoutShapeKey).join("|")}`;
}

/**
 * 把树收成预设。格子按视觉顺序保留笔记；不够的位置用 extraPageIds 补，
 * 多余的从末尾关掉并记在 droppedPageIds。调用方负责补空笔记、且不删除被关掉的笔记。
 * 补不满时返回 null，不改原树。
 */
export function applyLayoutPreset(
  state: SplitState,
  preset: LayoutPresetName,
  extraPageIds: readonly string[],
  ids: SplitNodeIds = defaultIds(),
): LayoutPresetResult | null {
  const count = presetPaneCount(preset);
  const leaves = walkLeaves(state.root);
  const missing = count - Math.min(leaves.length, count);
  if (extraPageIds.length < missing) return null;

  const kept = leaves.slice(0, count);
  const droppedPageIds = leaves.slice(count).map((leaf) => leaf.pageId);
  const slots: SplitLeaf[] = [
    ...kept,
    ...extraPageIds.slice(0, missing).map((pageId) => ({
      kind: "leaf" as const,
      id: ids.leaf(),
      pageId,
    })),
  ];
  const focusedLeafId = slots.some((slot) => slot.id === state.focusedLeafId)
    ? state.focusedLeafId
    : slots[slots.length - 1].id;
  const root = buildRoot(preset, slots, ids);
  if (
    layoutShapeKey(state.root) === layoutShapeKey(root) &&
    state.focusedLeafId === focusedLeafId
  ) {
    if (state.zoomedLeafId === null) return { state, droppedPageIds };
    return { state: { ...state, zoomedLeafId: null }, droppedPageIds };
  }
  return {
    state: { root, focusedLeafId, zoomedLeafId: null },
    droppedPageIds,
  };
}

function equalizeNode(node: SplitNode): SplitNode {
  if (node.kind === "leaf") return node;
  const sizes = normalizeSizes(node.children.map(() => 1), node.children.length);
  const children = node.children.map(equalizeNode);
  const sameSizes = sizes.length === node.sizes.length && sizes.every((size, index) => size === node.sizes[index]);
  const sameChildren = children.every((child, index) => child === node.children[index]);
  if (sameSizes && sameChildren) return node;
  return { ...node, children, sizes };
}

/** 只把每一组的尺寸改成均分，叶子、焦点和放大都不动。 */
export function equalizeSplitSizes(state: SplitState): SplitState {
  const root = equalizeNode(state.root);
  if (root === state.root) return state;
  return { ...state, root };
}
