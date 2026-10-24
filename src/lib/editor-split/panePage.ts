import { findLeaf, focusLeaf, setLeafPage } from "./tree";
import type { SplitState } from "./types";

export type ReplaceSplitLeafResult = {
  state: SplitState;
  previousPageId: string;
};

export function replaceSplitLeafPage(
  state: SplitState,
  leafId: string,
  pageId: string,
): ReplaceSplitLeafResult | null {
  const leaf = findLeaf(state.root, leafId);
  if (!leaf) return null;
  return {
    state: focusLeaf(setLeafPage(state, leafId, pageId), leafId),
    previousPageId: leaf.pageId,
  };
}

export function splitPaneAcceptsPage<
  T extends { isFolder?: boolean; trashedAt?: number },
>(page: T | null | undefined): page is T {
  return !!page && !page.isFolder && !page.trashedAt;
}
