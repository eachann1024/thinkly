import { flushEditorContent, usePages } from "@/stores/usePages";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { isHistoryPreviewSurface } from "./commandContext";
import { focusSplitPane } from "./commands";
import { discardFailedSplitPage } from "./createBlankPage";
import { replaceSplitLeafPage, splitPaneAcceptsPage } from "./panePage";

/**
 * 替换指定分屏格的页面并聚焦这一格。其它格的 pageId 不动。
 * 目标页已经开在另一格时也不改那一格：与 tryShowPageInFocusedSplit 一样允许两格同一页，不跳走。
 * 空草稿被换走时同样直接 discard，不额外看它是否还留在别的格子里。
 */
export function replaceSplitPanePage(
  tabId: string,
  leafId: string,
  pageId: string,
): boolean {
  if (isHistoryPreviewSurface()) return false;
  const page = usePages.getState().getPage(pageId);
  if (!splitPaneAcceptsPage(page)) return false;

  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tabId);
  if (!state) return false;
  const replaced = replaceSplitLeafPage(state, leafId, pageId);
  if (!replaced) return false;

  if (replaced.previousPageId !== pageId) {
    flushEditorContent(true);
    split.setPanePage(tabId, leafId, pageId);
    discardFailedSplitPage(replaced.previousPageId);
  }
  return focusSplitPane(tabId, leafId) !== null;
}
