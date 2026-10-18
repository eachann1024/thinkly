import { toast } from "@/components/ui/sonner";
import { flushEditorContent, usePages } from "@/stores/usePages";
import { isSpecialTab, useTabs } from "@/stores/useTabs";
import { useEditorSplit, toggleMaximizePane } from "@/stores/useEditorSplit";
import { maximizedPaneAfterTreeChange, writeMaximizedPane } from "./paneMaximize";
import { walkLeaves } from "./tree";
import { neighborLeaf } from "./treeGeometry";
import type { SplitNeighborDirection, SplitState } from "./types";
import {
  applyLayoutPreset,
  equalizeSplitSizes,
  presetPaneCount,
  type LayoutPresetName,
} from "./layoutPreset";
import {
  isSplitLayoutMenuAction,
  SPLIT_LAYOUT_MENU_EVENT,
  type SplitLayoutMenuAction,
} from "./layoutMenu";
import { createSplitBlankPage, discardFailedSplitPage } from "./createBlankPage";
import { focusSplitPane } from "./commands";
import {
  activeWorkspaceTab,
  canSplitCurrentView,
  isLiveEditorPage,
  isNormalEditorSurface,
} from "./commandContext";

function commitTabSplit(tabId: string, next: SplitState) {
  useEditorSplit.setState((current) => {
    const previous = current.byTabId[tabId];
    if (!previous || previous === next) return current;
    const maximizedPaneIdByTab = writeMaximizedPane(
      current.maximizedPaneIdByTab,
      tabId,
      maximizedPaneAfterTreeChange(next, current.maximizedPaneIdByTab[tabId] ?? null),
    );
    return {
      byTabId: { ...current.byTabId, [tabId]: next },
      ...(maximizedPaneIdByTab === current.maximizedPaneIdByTab ? {} : { maximizedPaneIdByTab }),
    };
  });
}

function recentFillers(focusedPageId: string, used: Set<string>, limit: number): string[] {
  if (limit <= 0) return [];
  const tabs = useTabs.getState().openTabs
    .filter((tab) => !isSpecialTab(tab) && tab.pageId && tab.pageId !== focusedPageId && !used.has(tab.pageId))
    .sort((a, b) => (b.lastAccessedAt ?? 0) - (a.lastAccessedAt ?? 0));
  const ids: string[] = [];
  for (const tab of tabs) {
    if (ids.includes(tab.pageId) || !isLiveEditorPage(usePages.getState().getPage(tab.pageId))) continue;
    ids.push(tab.pageId);
    if (ids.length >= limit) break;
  }
  return ids;
}

function releaseUnused(pageIds: string[], stillShown: Set<string>) {
  for (const pageId of pageIds) {
    if (!stillShown.has(pageId)) discardFailedSplitPage(pageId);
  }
}

/** 没有相邻格时不交换。zoom 占满时 movePane 不改树。 */
export function swapFocusedSplitPane(dir: SplitNeighborDirection): boolean {
  if (!isNormalEditorSurface()) return false;
  const tab = activeWorkspaceTab();
  if (!tab) return false;
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tab.id);
  if (!state) return false;
  const neighbor = neighborLeaf(state, state.focusedLeafId, dir);
  if (!neighbor) return false;
  return split.movePane(tab.id, state.focusedLeafId, neighbor.id, "center");
}

export function toggleFocusedPaneMaximize(): void {
  if (!isNormalEditorSurface()) return;
  const tab = activeWorkspaceTab();
  if (!tab) return;
  const state = useEditorSplit.getState().getStateForTab(tab.id);
  if (!state) return;
  toggleMaximizePane(tab.id, state.focusedLeafId);
}

export async function runSplitLayout(action: SplitLayoutMenuAction): Promise<boolean> {
  const blocked = canSplitCurrentView();
  if (blocked) {
    toast.error(blocked);
    return false;
  }
  const tab = activeWorkspaceTab();
  if (!tab || isSpecialTab(tab)) return false;
  const split = useEditorSplit.getState();
  split.ensureTab(tab.id, tab.pageId);
  const state = split.getStateForTab(tab.id);
  if (!state) return false;
  if (action === "equalize") {
    commitTabSplit(tab.id, equalizeSplitSizes(state));
    return true;
  }
  return applyPreset(tab.id, state, action);
}

async function applyPreset(tabId: string, state: SplitState, preset: LayoutPresetName): Promise<boolean> {
  const leaves = walkLeaves(state.root);
  const missing = Math.max(0, presetPaneCount(preset) - leaves.length);
  const focusedPageId = leaves.find((leaf) => leaf.id === state.focusedLeafId)?.pageId ?? "";
  const fillers = recentFillers(focusedPageId, new Set(leaves.map((leaf) => leaf.pageId)), missing);
  const created: string[] = [];
  while (fillers.length < missing) {
    const source = focusedPageId || leaves[0]?.pageId || "";
    const blank = await createSplitBlankPage(source);
    if (!blank) {
      releaseUnused(created, new Set());
      return false;
    }
    created.push(blank);
    fillers.push(blank);
  }

  flushEditorContent(true);
  const latest = useEditorSplit.getState().getStateForTab(tabId) ?? state;
  const result = applyLayoutPreset(latest, preset, fillers);
  if (!result) {
    releaseUnused(created, new Set());
    return false;
  }
  commitTabSplit(tabId, result.state);
  const shown = new Set(walkLeaves(result.state.root).map((leaf) => leaf.pageId));
  releaseUnused([...result.droppedPageIds, ...created], shown);
  focusSplitPane(tabId, result.state.focusedLeafId);
  return true;
}

export function installSplitLayoutMenuBridge(): () => void {
  const onLayout = (event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (!isSplitLayoutMenuAction(action)) return;
    void runSplitLayout(action);
  };
  window.addEventListener(SPLIT_LAYOUT_MENU_EVENT, onLayout);
  return () => window.removeEventListener(SPLIT_LAYOUT_MENU_EVENT, onLayout);
}
