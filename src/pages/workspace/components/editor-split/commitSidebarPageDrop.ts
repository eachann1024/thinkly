import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/pages/workspace/components/editor-split/commitSidebarPageDrop.ts#localMessages:1">`
zh-Hans:
  youCanOpenUpToPanes: "最多只能分成 4 格"
  thisNoteIsNoLongerAvailable: "这篇笔记已不可用"
en:
  youCanOpenUpToPanes: "You can open up to 4 panes"
  thisNoteIsNoLongerAvailable: "This note is no longer available"
ja:
  youCanOpenUpToPanes: "分割は最大 4 つまでです"
  thisNoteIsNoLongerAvailable: "このノートは利用できなくなりました"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { applySidebarPageDrop } from "@/lib/editor-split/sidebarPageDrop";
import { canSplitCurrentView, isLiveEditorPage } from "@/lib/editor-split/commandContext";
import { focusSplitPane } from "@/lib/editor-split/commands";
import { replaceSplitPanePage } from "@/lib/editor-split/replacePanePage";
import type { SplitDropPlacement } from "@/lib/editor-split/types";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { flushEditorContent, usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";

export function commitSidebarPageDrop(
  tabId: string,
  paneId: string,
  placement: SplitDropPlacement,
  pageId: string,
): boolean {
  if (useTabs.getState().activeTabId !== tabId) return false;
  const blocked = canSplitCurrentView();
  if (blocked) {
    toast.error(blocked);
    return false;
  }
  const page = usePages.getState().getPage(pageId);
  if (!isLiveEditorPage(page)) {
    toast.error(uiText("thisNoteIsNoLongerAvailable"));
    return false;
  }
  if (placement === "center") return replaceSplitPanePage(tabId, paneId, pageId);

  flushEditorContent(true);
  const current = useEditorSplit.getState().getStateForTab(tabId);
  if (!current) return false;
  const applied = applySidebarPageDrop(current, paneId, placement, pageId, page);
  if (!applied.ok) {
    if (applied.reason === "full") toast.error(uiText("youCanOpenUpToPanes"));
    return false;
  }
  let committed = false;
  useEditorSplit.setState((store) => {
    if (store.byTabId[tabId] !== current) return store;
    committed = true;
    return { byTabId: { ...store.byTabId, [tabId]: applied.state } };
  });
  if (!committed) return false;
  return focusSplitPane(tabId, applied.focusedLeafId) !== null;
}
