import { replaceSplitLeafPage, splitPaneAcceptsPage } from "./panePage";
import { countLeaves, findLeaf, splitLeaf } from "./tree";
import { GOOSE_FOLDER_MIME, GOOSE_PAGE_MIME } from "@/lib/workspace-drag";
import {
  MAX_SPLIT_LEAVES,
  type SplitDropPlacement,
  type SplitLeaf,
  type SplitNode,
  type SplitState,
} from "./types";

/** 与分屏拖拽 findPointerTarget 同一阈值；满 4 格时边缘返回 null，不退回中央。 */
export const SIDEBAR_PAGE_DROP_EDGE_RATIO = 0.28;

export type SidebarDropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SidebarDropPage = { isFolder?: boolean; trashedAt?: number } | null | undefined;

export type SidebarPageDropResult =
  | {
      ok: true;
      kind: "split" | "replace";
      state: SplitState;
      focusedLeafId: string;
      newLeafId?: string;
    }
  | { ok: false; reason: "folder" | "rejected" | "full" | "missing" };

/** 侧栏笔记拖拽。文件夹 MIME 留给目录树，不在这里认。 */
export function isSidebarPageDrag(types: readonly string[]): boolean {
  return types.includes(GOOSE_PAGE_MIME) && !types.includes(GOOSE_FOLDER_MIME);
}

/**
 * 指针在格子内：最近边小于 28% 为该边缘，否则中央。
 * 文件夹没有落点。已满 4 格时边缘没有落点，中央仍可替换。
 */
export function resolveSidebarPageDrop(input: {
  rect: SidebarDropRect;
  x: number;
  y: number;
  leafCount: number;
  folder?: boolean;
}): SplitDropPlacement | null {
  if (input.folder) return null;
  const { rect, x, y } = input;
  if (rect.width <= 0 || rect.height <= 0) return null;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  if (x < rect.left || x > right || y < rect.top || y > bottom) return null;
  const edges: [SplitDropPlacement, number][] = [
    ["left", (x - rect.left) / rect.width],
    ["right", (right - x) / rect.width],
    ["top", (y - rect.top) / rect.height],
    ["bottom", (bottom - y) / rect.height],
  ];
  const nearest = edges.reduce((best, edge) => (edge[1] < best[1] ? edge : best));
  if (nearest[1] >= SIDEBAR_PAGE_DROP_EDGE_RATIO) return "center";
  if (input.leafCount >= MAX_SPLIT_LEAVES) return null;
  return nearest[0];
}

function swapLeaves(node: SplitNode, source: SplitLeaf, added: SplitLeaf): SplitNode {
  if (node.kind === "leaf") {
    return node.id === source.id ? added : node.id === added.id ? source : node;
  }
  return { ...node, children: node.children.map((child) => swapLeaves(child, source, added)) };
}

/**
 * 边缘在该方向新开一格并聚焦新格；中央只替换目标格并聚焦。
 * splitLeaf 只把新格插在目标之后，左/上再对调，新笔记才落在该侧。
 */
export function applySidebarPageDrop(
  state: SplitState,
  paneId: string,
  placement: SplitDropPlacement,
  pageId: string,
  page: SidebarDropPage,
  ids?: { newLeafId?: string; newGroupId?: string },
): SidebarPageDropResult {
  if (page?.isFolder) return { ok: false, reason: "folder" };
  if (!splitPaneAcceptsPage(page)) return { ok: false, reason: "rejected" };
  if (!findLeaf(state.root, paneId)) return { ok: false, reason: "missing" };
  if (placement === "center") {
    const replaced = replaceSplitLeafPage(state, paneId, pageId);
    if (!replaced) return { ok: false, reason: "missing" };
    return {
      ok: true,
      kind: "replace",
      state: replaced.state,
      focusedLeafId: replaced.state.focusedLeafId,
    };
  }
  if (countLeaves(state.root) >= MAX_SPLIT_LEAVES) return { ok: false, reason: "full" };
  const direction = placement === "left" || placement === "right" ? "right" : "down";
  const opened = splitLeaf(state, {
    leafId: paneId,
    direction,
    newPageId: pageId,
    newLeafId: ids?.newLeafId,
    newGroupId: ids?.newGroupId,
  });
  if (!opened.ok) return { ok: false, reason: "full" };
  const source = findLeaf(state.root, paneId);
  const added = findLeaf(opened.state.root, opened.newLeafId);
  if (!source || !added) return { ok: false, reason: "missing" };
  const next = placement === "left" || placement === "top"
    ? { ...opened.state, root: swapLeaves(opened.state.root, source, added) }
    : opened.state;
  return {
    ok: true,
    kind: "split",
    state: next,
    focusedLeafId: opened.newLeafId,
    newLeafId: opened.newLeafId,
  };
}
