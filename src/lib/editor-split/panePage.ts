import { findLeaf, focusLeaf, setLeafPage } from "./tree";
import type { SplitState } from "./types";

export type ReplaceSplitLeafResult = {
  state: SplitState;
  previousPageId: string;
};

/**
 * 只改目标叶的 pageId，并把焦点移到这一叶。其它叶保持原页面。
 * 树不认识文件夹；调用方必须先用 splitPaneAcceptsPage 拒绝。
 */
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

/** 与 isLiveEditorPage 同一约束：文件夹和回收站页不能成为分屏内容。 */
export function splitPaneAcceptsPage<
  T extends { isFolder?: boolean; trashedAt?: number },
>(page: T | null | undefined): page is T {
  return !!page && !page.isFolder && !page.trashedAt;
}
