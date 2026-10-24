import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/editor-split/commandContext.ts#localMessages:1">`
zh-Hans:
  splitViewIsnTAvailableInFullScreenAi: "全屏 AI 下不能分屏"
  splitViewIsnTAvailableInThisView: "当前视图不能分屏"
  splitViewIsnTAvailableInVersionHistory: "历史预览下不能分屏"
en:
  splitViewIsnTAvailableInFullScreenAi: "Split view isn’t available in full-screen AI mode"
  splitViewIsnTAvailableInThisView: "Split view isn’t available in this view"
  splitViewIsnTAvailableInVersionHistory: "Split view isn’t available in version history"
ja:
  splitViewIsnTAvailableInFullScreenAi: "フルスクリーン AI では分割表示を使用できません"
  splitViewIsnTAvailableInThisView: "このビューでは分割表示を使用できません"
  splitViewIsnTAvailableInVersionHistory: "バージョン履歴では分割表示を使用できません"
`;
const uiText = createTranslator(localMessages);
import { isNotebookAiFullscreenOpen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import type { Page } from "@/types";
import { splitPaneAcceptsPage } from "@/lib/editor-split/panePage";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useHistoryView } from "@/stores/useHistoryView";
import { isSpecialTab, useTabs } from "@/stores/useTabs";

export interface FocusSplitPaneOptions {
  focusEditor?: boolean;
}

export function activeWorkspaceTab() {
  const { activeTabId, openTabs } = useTabs.getState();
  if (!activeTabId) return null;
  return openTabs.find((tab) => tab.id === activeTabId) ?? null;
}

export function focusActiveSplitEditor() {
  if (typeof window === "undefined") return;
  const dispatch = () => {
    window.dispatchEvent(new CustomEvent("goose-note:focus-editor-body"));
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(dispatch);
  } else {
    queueMicrotask(dispatch);
  }
}

export function syncNotebookForSplitPage(pageId: string) {
  const page = usePages.getState().getPage(pageId);
  if (!page?.workspaceId) return;
  const notebooks = useNotebooks.getState();
  const pages = usePages.getState();
  const notebook = notebooks.notebooks[page.workspaceId];
  const isLocalFolder = notebook?.source === "local-folder";
  const isCurrentNotebook = notebooks.activeNotebookId === page.workspaceId;
  const isLoadingCurrentLocal =
    isCurrentNotebook &&
    isLocalFolder &&
    notebooks.getLocalFolderLoadState(page.workspaceId).status === "loading";

  if (!isCurrentNotebook && isLocalFolder) {
    pages.setPendingNavigatePageId(page.id);
  } else if (isLoadingCurrentLocal) {
    pages.setPendingNavigatePageId(page.id);
  } else if (pages.pendingNavigatePageId) {
    pages.setPendingNavigatePageId(null);
  }
  if (isCurrentNotebook) return;

  notebooks.setActiveNotebook(page.workspaceId);
}

export function isLiveEditorPage(page: Page | undefined): page is Page {
  return splitPaneAcceptsPage(page);
}

export function isHistoryPreviewSurface(): boolean {
  const historyPageId = useHistoryView.getState().active;
  if (!historyPageId) return false;
  return historyPageId === usePages.getState().activePageId;
}

export function isNormalEditorSurface(): boolean {
  if (isNotebookAiFullscreenOpen()) return false;
  if (isHistoryPreviewSurface()) return false;
  const tab = activeWorkspaceTab();
  if (!tab || isSpecialTab(tab)) return false;
  const page = usePages.getState().getPage(tab.pageId);
  if (page?.isFolder) return false;
  return true;
}

export function canSplitCurrentView(): string | null {
  if (isNotebookAiFullscreenOpen()) return uiText("splitViewIsnTAvailableInFullScreenAi");
  const tab = activeWorkspaceTab();
  if (!tab || isSpecialTab(tab)) return uiText("splitViewIsnTAvailableInThisView");
  const page = usePages.getState().getPage(tab.pageId);
  if (page?.isFolder) return uiText("splitViewIsnTAvailableInThisView");
  if (isHistoryPreviewSurface()) {
    return uiText("splitViewIsnTAvailableInVersionHistory");
  }
  return null;
}
