import type { DraggingPosition } from "react-complex-tree";

export const MAIN_TREE_EDGE_BAND = 12;

export type MainTreeEdgeZone = "top" | "bottom";

export interface MainTreeEdgeZoneParams {
  pointerX: number;
  pointerY: number;
  viewportRect: { top: number; bottom: number; left: number; right: number };
  lastRowBottom: number;
}

export function resolveMainTreeEdgeZone({
  pointerX,
  pointerY,
  viewportRect,
  lastRowBottom,
}: MainTreeEdgeZoneParams): MainTreeEdgeZone | null {
  if (pointerX < viewportRect.left || pointerX > viewportRect.right) {
    return null;
  }
  if (pointerY <= viewportRect.top + MAIN_TREE_EDGE_BAND) {
    return "top";
  }
  if (
    pointerY >= viewportRect.bottom - MAIN_TREE_EDGE_BAND ||
    pointerY >= lastRowBottom
  ) {
    return "bottom";
  }
  return null;
}

export function mainTreeEdgeDropTarget(
  zone: MainTreeEdgeZone,
  rootChildCount: number,
): DraggingPosition {
  return {
    treeId: "main",
    targetType: "between-items",
    parentItem: "root",
    childIndex: zone === "top" ? 0 : rootChildCount,
    linearIndex: zone === "top" ? 0 : Math.max(rootChildCount - 1, 0),
    depth: 0,
    linePosition: zone === "top" ? "top" : "bottom",
  };
}
