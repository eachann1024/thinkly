import { closeLeaf } from "./tree";
import { createSplitNodeId, findLeafPath, replaceNode } from "./treePrimitives";
import type {
  SplitDropPlacement,
  SplitGroupOrientation,
  SplitLeaf,
  SplitNode,
  SplitState,
} from "./types";

function swapLeaves(
  node: SplitNode,
  source: SplitLeaf,
  target: SplitLeaf,
): SplitNode {
  if (node.kind === "leaf") {
    if (node.id === source.id) return target;
    if (node.id === target.id) return source;
    return node;
  }
  const children = node.children.map((child) => swapLeaves(child, source, target));
  if (children.every((child, index) => child === node.children[index])) return node;
  return { ...node, children };
}

/**
 * 中心互换完整叶子；边缘先移走源叶，再平分目标槽位。
 * 不创建页面、不经过关闭格子的 UI 路径；无效或原位拖放返回原状态。
 */
export function moveLeaf(
  state: SplitState,
  sourceId: string,
  targetId: string,
  placement: SplitDropPlacement,
): SplitState {
  if (state.zoomedLeafId !== null || sourceId === targetId) return state;
  if (!["left", "right", "top", "bottom", "center"].includes(placement)) {
    return state;
  }
  const source = findLeafPath(state.root, sourceId);
  const target = findLeafPath(state.root, targetId);
  if (!source || !target) return state;

  if (placement === "center") {
    return {
      ...state,
      root: swapLeaves(state.root, source.leaf, target.leaf),
    };
  }

  const orientation: SplitGroupOrientation =
    placement === "left" || placement === "right" ? "horizontal" : "vertical";
  const before = placement === "left" || placement === "top";
  // 已在目标同轴的这一侧相邻：保留用户尺寸，避免原位拖放触发重排。
  if (
    source.parent &&
    source.parent === target.parent &&
    source.parent.orientation === orientation &&
    source.index === target.index + (before ? -1 : 1)
  ) {
    return state;
  }

  const removed = closeLeaf(state, sourceId);
  if (removed.kind !== "updated" || removed.state === state) return state;
  // 移走源叶可能提升单子节点的 group，因此重新查找目标的父级和索引。
  const remainingRoot = removed.state.root;
  const destination = findLeafPath(remainingRoot, targetId);
  if (!destination) return state;

  const pair = before
    ? [source.leaf, destination.leaf]
    : [destination.leaf, source.leaf];
  const parent = destination.parent;
  let root: SplitNode;
  if (parent && parent.orientation === orientation) {
    const children = [...parent.children];
    children.splice(destination.index, 1, ...pair);
    const sizes = [...parent.sizes];
    const half = sizes[destination.index] / 2;
    sizes.splice(destination.index, 1, half, half);
    root = replaceNode(remainingRoot, parent.id, { ...parent, children, sizes });
  } else {
    root = replaceNode(remainingRoot, targetId, {
      kind: "group",
      id: createSplitNodeId("group"),
      orientation,
      children: pair,
      sizes: [50, 50],
    });
  }

  // 只取关闭操作得到的树，焦点仍跟随原来的叶子 ID。
  return { ...state, root };
}
