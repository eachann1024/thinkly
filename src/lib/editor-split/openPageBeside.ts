import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/editor-split/openPageBeside.ts#localMessages:1">`
zh-Hans:
  thisNoteIsNoLongerAvailable: "这篇笔记已不可用"
  youCanOpenUpToPanes: "最多只能分成 4 格"
en:
  thisNoteIsNoLongerAvailable: "This note is no longer available"
  youCanOpenUpToPanes: "You can open up to 4 panes"
ja:
  thisNoteIsNoLongerAvailable: "このノートは利用できなくなりました"
  youCanOpenUpToPanes: "分割は最大 4 つまでです"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { flushEditorContent, usePages } from "@/stores/usePages";
import { isSpecialTab, useTabs } from "@/stores/useTabs";
import { focusSplitPane } from "./commands";
import { canSplitCurrentView, isLiveEditorPage } from "./commandContext";
import { applySidebarPageDrop } from "./sidebarPageDrop";
import { countLeaves, MAX_SPLIT_LEAVES } from "./tree";

export type OpenBesidePlacement = "right" | "bottom";

/**
 * 把已有笔记开到当前格的右侧或下方，并聚焦新格。
 * 单格编辑区同样适用：ensureTab 先补出当前页这一格。
 * 文件夹、回收站、满 4 格和不可分屏的视图都拒绝，不改现有布局。
 */
export function openPageBeside(
  pageId: string,
  placement: OpenBesidePlacement,
): boolean {
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
  const tab = useTabs.getState().openTabs.find((item) => item.id === useTabs.getState().activeTabId);
  if (!tab || isSpecialTab(tab)) return false;

  flushEditorContent(true);
  const split = useEditorSplit.getState();
  split.ensureTab(tab.id, tab.pageId);
  const current = split.getStateForTab(tab.id);
  if (!current) return false;
  if (countLeaves(current.root) >= MAX_SPLIT_LEAVES) {
    toast.error(uiText("youCanOpenUpToPanes"));
    return false;
  }
  const applied = applySidebarPageDrop(
    current,
    current.focusedLeafId,
    placement,
    pageId,
    page,
  );
  if (!applied.ok) {
    if (applied.reason === "full") toast.error(uiText("youCanOpenUpToPanes"));
    else if (applied.reason === "folder" || applied.reason === "rejected") {
      toast.error(uiText("thisNoteIsNoLongerAvailable"));
    }
    return false;
  }
  let committed = false;
  useEditorSplit.setState((store) => {
    if (store.byTabId[tab.id] !== current) return store;
    committed = true;
    return { byTabId: { ...store.byTabId, [tab.id]: applied.state } };
  });
  if (!committed) return false;
  return focusSplitPane(tab.id, applied.focusedLeafId) !== null;
}
