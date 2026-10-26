import type { TabSet, TabGet, TabsState } from "./types";
import type { TabsActionContext } from "./context";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { isSpecialTab } from "./types";
import {
  commitActiveEditor,
  collectTabPageIds,
  flushClosedPageSaves,
  workspaceTabPageId,
  scheduleSetActivePage,
  collectTabsPageIds,
} from "./helpers";
import { usePages } from "../usePages";
import {
  isUnsavedEditorPage,
  localPageHasPersistableContent,
} from "@/lib/unsavedLocalPage";
import { useNotebooks } from "../useNotebooks";
import { listVisibleWorkspaceTabs } from "@/pages/workspace/components/page/visibleTabs";
import { runWithPresence } from "@/lib/ui/presence";

export function createClosingTabActions(
  set: TabSet,
  get: TabGet,
  context: TabsActionContext,
): Pick<
  TabsState,
  "closeTab" | "closeOtherTabs" | "closeTabsToLeft" | "closeTabsToRight"
> {
  const { syncHistoryWithOpenTabs, resolveTabIdInHistory } = context;
  return {
    closeTab: (tabId: string) => {
      if (effectiveSingleTabMode()) return;
      if (!get().openTabs.some((tab) => tab.id === tabId)) return;
      runWithPresence(() => {
      const { openTabs, activeTabId, recentlyClosedPageIds } = get();
      const index = openTabs.findIndex((tab) => tab.id === tabId);
      if (index === -1) return;

      const closedTab = openTabs[index];
      const special = isSpecialTab(closedTab);
      if (tabId === activeTabId) commitActiveEditor();
      if (!special) {
        const closedPageIds = collectTabPageIds(closedTab);
        const toFlush: string[] = [];
        for (const pageId of closedPageIds) {
          const closedPage = usePages.getState().getPage(pageId);
          if (
            isUnsavedEditorPage(closedPage) &&
            !localPageHasPersistableContent(closedPage.content)
          ) {
            usePages.getState().discardEditorDraftPage(pageId);
          } else {
            toFlush.push(pageId);
          }
        }
        flushClosedPageSaves(toFlush);
        if (toFlush.length > 0) {
          const nextClosed = [
            ...toFlush,
            ...recentlyClosedPageIds.filter((id) => !toFlush.includes(id)),
          ].slice(0, 10);
          set({ recentlyClosedPageIds: nextClosed });
        }
      }

      const nextTabs = openTabs.filter((tab) => tab.id !== tabId);
      const notebookId = useNotebooks.getState().activeNotebookId;
      const visibleTabs = listVisibleWorkspaceTabs(openTabs, usePages.getState().getPage, notebookId);
      const nextVisibleTabs = listVisibleWorkspaceTabs(nextTabs, usePages.getState().getPage, notebookId);

      if (nextTabs.length === 0) {
        set({ openTabs: [], activeTabId: null });
        get().openWelcomeTab();
        return;
      }

      let nextActiveId: string | null = null;
      if (activeTabId === tabId) {
        const visibleIndex = visibleTabs.findIndex((tab) => tab.id === tabId);
        nextActiveId = nextVisibleTabs[Math.min(Math.max(visibleIndex, 0), nextVisibleTabs.length - 1)]?.id ?? null;
      } else if (activeTabId !== tabId) {
        nextActiveId = resolveTabIdInHistory(activeTabId, nextTabs);
      }

      const historyState = syncHistoryWithOpenTabs(nextTabs);
      const fallbackActiveId = resolveTabIdInHistory(nextActiveId, nextVisibleTabs);

      set({
        openTabs: nextTabs,
        activeTabId: fallbackActiveId,
        ...historyState,
      });
      const nextActiveTab = nextTabs.find((tab) => tab.id === fallbackActiveId);
      if (!nextActiveTab || nextActiveTab.type === "welcome") {
        void scheduleSetActivePage(null);
      }
      if (nextActiveTab && !isSpecialTab(nextActiveTab)) {
        const pageId = workspaceTabPageId(nextActiveTab);
        get().syncNotebookForPage(pageId);
        void scheduleSetActivePage(pageId);
      } else if (
        nextActiveTab?.type === "notebook-ai" &&
        nextActiveTab.workspaceId
      ) {
        const notebookStore = useNotebooks.getState();
        if (notebookStore.activeNotebookId !== nextActiveTab.workspaceId) {
          notebookStore.setActiveNotebook(nextActiveTab.workspaceId);
        }
      }
      });
    },

    closeOtherTabs: (tabId: string) => runWithPresence(() => {
      if (effectiveSingleTabMode()) return;
      const { openTabs, activeTabId } = get();
      const currentTab = openTabs.find((tab) => tab.id === tabId);
      if (!currentTab) return;

      const visibleIds = new Set(listVisibleWorkspaceTabs(openTabs, usePages.getState().getPage, useNotebooks.getState().activeNotebookId).map(tab => tab.id));
      const nextTabs = openTabs.filter(tab => tab.id === tabId || !visibleIds.has(tab.id));

      const nextTabIds = new Set(nextTabs.map((t) => t.id));
      const closedTabs = openTabs.filter((t) => !nextTabIds.has(t.id));
      if (closedTabs.some((t) => t.id === activeTabId)) commitActiveEditor();
      flushClosedPageSaves(collectTabsPageIds(closedTabs));

      const historyState = syncHistoryWithOpenTabs(nextTabs);
      set({
        openTabs: nextTabs,
        activeTabId: currentTab.id,
        ...historyState,
      });
      const pageId = isSpecialTab(currentTab) ? null : workspaceTabPageId(currentTab);
      get().syncNotebookForPage(pageId);
      void scheduleSetActivePage(pageId);
    }),

    closeTabsToLeft: (tabId: string) => runWithPresence(() => {
      if (effectiveSingleTabMode()) return;
      const { openTabs, activeTabId } = get();
      const currentIndex = openTabs.findIndex((tab) => tab.id === tabId);
      if (currentIndex <= 0) return;

      const visibleIds = new Set(listVisibleWorkspaceTabs(openTabs, usePages.getState().getPage, useNotebooks.getState().activeNotebookId).map(tab => tab.id));
      const nextTabs = openTabs.filter((tab, index) => index >= currentIndex || !visibleIds.has(tab.id));
      const nextActiveId = nextTabs.some((tab) => tab.id === activeTabId)
        ? activeTabId
        : tabId;

      const nextTabIds = new Set(nextTabs.map((t) => t.id));
      const closedTabs = openTabs.filter((t) => !nextTabIds.has(t.id));
      if (closedTabs.some((t) => t.id === activeTabId)) commitActiveEditor();
      flushClosedPageSaves(collectTabsPageIds(closedTabs));

      const historyState = syncHistoryWithOpenTabs(nextTabs);

      set({
        openTabs: nextTabs,
        activeTabId: nextActiveId,
        ...historyState,
      });
      const nextActiveTab = nextTabs.find((tab) => tab.id === nextActiveId);
      const nextPageId = nextActiveTab
        ? isSpecialTab(nextActiveTab)
          ? null
          : workspaceTabPageId(nextActiveTab)
        : null;
      get().syncNotebookForPage(nextPageId);
      void scheduleSetActivePage(nextPageId);
    }),

    closeTabsToRight: (tabId: string) => runWithPresence(() => {
      if (effectiveSingleTabMode()) return;
      const { openTabs, activeTabId } = get();
      const currentIndex = openTabs.findIndex((tab) => tab.id === tabId);
      if (currentIndex === -1 || currentIndex >= openTabs.length - 1) return;

      const visibleIds = new Set(listVisibleWorkspaceTabs(openTabs, usePages.getState().getPage, useNotebooks.getState().activeNotebookId).map(tab => tab.id));
      const nextTabs = openTabs.filter((tab, index) => index <= currentIndex || !visibleIds.has(tab.id));
      const nextActiveId = nextTabs.some((tab) => tab.id === activeTabId)
        ? activeTabId
        : tabId;

      const nextTabIds = new Set(nextTabs.map((t) => t.id));
      const closedTabs = openTabs.filter((t) => !nextTabIds.has(t.id));
      if (closedTabs.some((t) => t.id === activeTabId)) commitActiveEditor();
      flushClosedPageSaves(collectTabsPageIds(closedTabs));

      const historyState = syncHistoryWithOpenTabs(nextTabs);

      set({
        openTabs: nextTabs,
        activeTabId: nextActiveId,
        ...historyState,
      });
      const nextActiveTab = nextTabs.find((tab) => tab.id === nextActiveId);
      const nextPageId = nextActiveTab
        ? isSpecialTab(nextActiveTab)
          ? null
          : workspaceTabPageId(nextActiveTab)
        : null;
      get().syncNotebookForPage(nextPageId);
      void scheduleSetActivePage(nextPageId);
    }),
  };
}
