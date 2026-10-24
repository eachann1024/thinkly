import { flushEditorContent, usePages } from "@/stores/usePages";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { isHistoryPreviewSurface } from "./commandContext";
import { focusSplitPane } from "./commands";
import { discardFailedSplitPage } from "./createBlankPage";
import { collectOpenedPagePlaces } from "./paneMenuActions";
import { replaceSplitLeafPage, splitPaneAcceptsPage } from "./panePage";
import { replacedDraftStillReferenced } from "./pageReferences";

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
    if (!replacedDraftStillReferenced(
      replaced.previousPageId,
      collectOpenedPagePlaces(),
      tabId,
    )) {
      discardFailedSplitPage(replaced.previousPageId);
    }
  }
  return focusSplitPane(tabId, leafId) !== null;
}
