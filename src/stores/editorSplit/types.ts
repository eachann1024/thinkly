import type {
  SplitState,
  SplitFocusedInput,
  SplitFocusedResult,
  CloseFocusedResult,
  SplitNeighborDirection,
  SplitDropPlacement,
} from "@/lib/editor-split/types";

export const EDITOR_SPLIT_PERSIST_KEY_PREFIX = "thinkly:editor-split:v1";

export function editorSplitPersistKey(windowId: string): string {
  return `${EDITOR_SPLIT_PERSIST_KEY_PREFIX}:${windowId}`;
}

export type PersistedSplits = {
  byTabId: Record<string, SplitState>;
};

export type EditorSplitStore = {
  byTabId: Record<string, SplitState>;
  /** 临时放大，按 tabId 记格子。不写入布局树，也不进持久化。 */
  maximizedPaneIdByTab: Record<string, string>;
  getStateForTab: (tabId: string) => SplitState | null;
  splitFocused: (input: SplitFocusedInput) => SplitFocusedResult;
  closeFocused: (tabId: string) => CloseFocusedResult;
  closePane: (tabId: string, leafId: string) => CloseFocusedResult;
  movePane: (
    tabId: string,
    sourceId: string,
    targetId: string,
    placement: SplitDropPlacement,
  ) => boolean;
  focusPane: (tabId: string, paneId: string) => void;
  focusNeighbor: (tabId: string, dir: SplitNeighborDirection) => string | null;
  setGroupSizes: (tabId: string, groupId: string, sizes: number[]) => void;
  toggleZoom: (tabId: string) => void;
  toggleMaximizePane: (tabId: string, paneId: string) => void;
  setPanePage: (tabId: string, paneId: string, pageId: string) => void;
  ensureTab: (tabId: string, pageId: string) => void;
  clearTab: (tabId: string) => void;
  focusedPageId: (tabId: string) => string | null;
  isSplit: (tabId: string) => boolean;
  /** 缺省为关。只存打开的标签。 */
  syncScrollByTabId: Record<string, true>;
  toggleSyncScroll: (tabId: string) => void;
};
