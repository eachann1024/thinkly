import { moveLeaf } from "./move";
import { neighborLeaf } from "./treeGeometry";
import type { SplitNeighborDirection, SplitState } from "./types";

/**
 * 与几何相邻格交换笔记位置。
 * moveLeaf 的边缘放置在「已经贴在目标这一侧」时会原样返回，左右并排时快捷键会没反应，所以这里用 center。
 */
export function swapWithNeighbor(
  state: SplitState,
  dir: SplitNeighborDirection,
): SplitState {
  const neighbor = neighborLeaf(state, state.focusedLeafId, dir);
  if (!neighbor) return state;
  return moveLeaf(state, state.focusedLeafId, neighbor.id, "center");
}
