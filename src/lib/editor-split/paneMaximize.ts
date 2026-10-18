import { closeLeaf, countLeaves, findLeaf, focusLeaf, focusedPageIdOf } from "./tree";
import type { SplitLeaf, SplitState } from "./types";

/** 放大 id 不进布局树。只剩一格、格子不存在，或再次点同一格时还原。 */
export function toggleMaximizedPaneId(
  state: SplitState,
  current: string | null,
  paneId: string,
): string | null {
  if (countLeaves(state.root) <= 1) return null;
  if (!findLeaf(state.root, paneId)) {
    return current && findLeaf(state.root, current) ? current : null;
  }
  return current === paneId ? null : paneId;
}

/** 放大时换焦点，占满跟着新格走。没放大则保持空。 */
export function maximizedPaneAfterFocus(
  state: SplitState,
  current: string | null,
  paneId: string,
): string | null {
  if (!current) return null;
  if (countLeaves(state.root) <= 1) return null;
  if (!findLeaf(state.root, paneId)) {
    return findLeaf(state.root, current) ? current : null;
  }
  return paneId;
}

/**
 * 旧的 `zoomedLeafId` 会卸掉其它格。读入时并进临时放大，树里不再留缩放。
 * 只剩一格时直接还原。
 */
export function adoptLegacyZoom(byTabId: Record<string, SplitState>): {
  byTabId: Record<string, SplitState>;
  maximizedPaneIdByTab: Record<string, string>;
} {
  const maximizedPaneIdByTab: Record<string, string> = {};
  let next = byTabId;
  for (const [tabId, state] of Object.entries(byTabId)) {
    if (!state.zoomedLeafId) continue;
    if (next === byTabId) next = { ...byTabId };
    const paneId = toggleMaximizedPaneId(state, null, state.zoomedLeafId);
    next[tabId] = { ...state, zoomedLeafId: null };
    if (paneId) maximizedPaneIdByTab[tabId] = paneId;
  }
  return { byTabId: next, maximizedPaneIdByTab };
}

/** 焦点落到指定格，放大跟着走。没有变化时返回 null。 */
export function focusedPanePatch(
  store: { byTabId: Record<string, SplitState>; maximizedPaneIdByTab: Record<string, string> },
  tabId: string,
  paneId: string,
): { byTabId: Record<string, SplitState>; maximizedPaneIdByTab: Record<string, string> } | null {
  const current = store.byTabId[tabId];
  if (!current) return null;
  const next = focusLeaf(current, paneId);
  const maximizedPaneIdByTab = writeMaximizedPane(
    store.maximizedPaneIdByTab,
    tabId,
    maximizedPaneAfterFocus(next, store.maximizedPaneIdByTab[tabId] ?? null, paneId),
  );
  if (next === current && maximizedPaneIdByTab === store.maximizedPaneIdByTab) return null;
  return {
    byTabId: next === current ? store.byTabId : { ...store.byTabId, [tabId]: next },
    maximizedPaneIdByTab,
  };
}

/** 关掉被放大的格，或树里只剩一格时必须还原。不改传入的树。 */
export function maximizedPaneAfterTreeChange(
  state: SplitState | null,
  current: string | null,
): string | null {
  if (!state || !current) return null;
  if (countLeaves(state.root) <= 1) return null;
  if (!findLeaf(state.root, current)) return null;
  return current;
}

export function writeMaximizedPane(
  map: Record<string, string>,
  tabId: string,
  paneId: string | null,
): Record<string, string> {
  if (!paneId) {
    if (!(tabId in map)) return map;
    const next = { ...map };
    delete next[tabId];
    return next;
  }
  if (map[tabId] === paneId) return map;
  return { ...map, [tabId]: paneId };
}

/** 只保留目标格。原树不改；多格收成单叶后没有尺寸可保留。 */
export function retainOnlyPane(
  state: SplitState,
  leafId: string,
): SplitState | null {
  const leaf = findLeaf(state.root, leafId);
  if (!leaf) return null;
  if (countLeaves(state.root) <= 1) return state;
  const root: SplitLeaf = {
    kind: "leaf",
    id: leaf.id,
    pageId: leaf.pageId,
    ...(leaf.title ? { title: leaf.title } : {}),
  };
  return { root, focusedLeafId: leaf.id, zoomedLeafId: null };
}

export type SplitTabSlot = { id: string; pageId: string };

export type MovePaneToNewTabResult = {
  movedPageId: string;
  source: SplitState | null;
  sourceTabPageId: string | null;
  tabs: SplitTabSlot[];
  activeTabId: string;
  removeTabId: string | null;
};

/**
 * 把这一格的笔记挪到新标签并激活。
 * 只剩这一格时来源标签要关掉，否则笔记仍算开在原标签里。
 */
export function planMovePaneToNewTab(input: {
  tabId: string;
  leafId: string;
  state: SplitState;
  tabs: SplitTabSlot[];
  newTabId: string;
}): MovePaneToNewTabResult | null {
  const leaf = findLeaf(input.state.root, input.leafId);
  if (!leaf) return null;
  const movedPageId = leaf.pageId;
  const closed = closeLeaf(input.state, input.leafId);
  const newTab: SplitTabSlot = { id: input.newTabId, pageId: movedPageId };
  if (closed.kind === "last-pane") {
    return {
      movedPageId,
      source: null,
      sourceTabPageId: null,
      tabs: input.tabs.filter((tab) => tab.id !== input.tabId).concat(newTab),
      activeTabId: input.newTabId,
      removeTabId: input.tabId,
    };
  }
  const sourceTabPageId = focusedPageIdOf(closed.state);
  return {
    movedPageId,
    source: closed.state,
    sourceTabPageId,
    tabs: input.tabs
      .map((tab) =>
        tab.id === input.tabId && sourceTabPageId
          ? { ...tab, pageId: sourceTabPageId }
          : tab,
      )
      .concat(newTab),
    activeTabId: input.newTabId,
    removeTabId: null,
  };
}
