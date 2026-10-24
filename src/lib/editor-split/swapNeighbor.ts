import { moveLeaf } from "./move";
import { neighborLeaf } from "./treeGeometry";
import type { SplitNeighborDirection, SplitState } from "./types";

export function swapWithNeighbor(
  state: SplitState,
  dir: SplitNeighborDirection,
): SplitState {
  const neighbor = neighborLeaf(state, state.focusedLeafId, dir);
  if (!neighbor) return state;
  return moveLeaf(state, state.focusedLeafId, neighbor.id, "center");
}
