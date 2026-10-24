import { createSplitNodeId, normalizeSizes, walkLeaves } from "./treePrimitives";
import type { SplitGroup, SplitLeaf, SplitNode, SplitState } from "./types";

export type LayoutPresetName = "columns" | "rows" | "grid";

export type SplitNodeIds = {
  leaf: () => string;
  group: () => string;
};

export type LayoutPresetResult = {
  state: SplitState;
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

export function equalizeSplitSizes(state: SplitState): SplitState {
  const root = equalizeNode(state.root);
  if (root === state.root) return state;
  return { ...state, root };
}
