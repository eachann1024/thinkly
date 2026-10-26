import type { TabSet, TabGet, TabsState } from "./types";
import type { TabsActionContext } from "./context";
import { usePages } from "../usePages";
import { useNotebooks } from "../useNotebooks";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import {
  findTabByPageId,
  focusTabLeafForPage,
  commitActiveEditor,
  stampTabAccess,
  ensureSplitForWorkspaceTab,
  workspaceTabPageId,
  scheduleSetActivePage,
  cancelScheduledActivePage,
} from "./helpers";
import { isSpecialTab } from "./types";

export function createActivationTabActions(
  set: TabSet,
  get: TabGet,
  context: TabsActionContext,
): Pick<
  TabsState,
  | "cancelPendingActivation"
  | "syncNotebookForPage"
  | "syncActiveTabForPage"
  | "syncTabPageId"
  | "setActiveTab"
> {
  const { pushTabHistory, replaceWithSinglePage, replaceWithSingleWelcome } =
    context;
  return {
    cancelPendingActivation: () => {
      context.invalidateSingleTabSwitch();
      cancelScheduledActivePage();
    },

    syncNotebookForPage: (pageId: string | null) => {
      if (!pageId) return;
      const page = usePages.getState().getPage(pageId);
      if (!page) return;
      const notebookStore = useNotebooks.getState();
      if (notebookStore.notebooks[page.workspaceId] && notebookStore.activeNotebookId !== page.workspaceId) {
        notebookStore.setActiveNotebook(page.workspaceId);
      }
    },

    syncActiveTabForPage: (pageId: string | null) => {
      if (!pageId) {
        get().cancelPendingActivation();
        set({ activeTabId: null });
        usePages.getState().setActivePage(null);
        return;
      }
      if (effectiveSingleTabMode()) {
        void replaceWithSinglePage(pageId);
        return;
      }
      const { openTabs } = get();
      const existingTab = findTabByPageId(openTabs, pageId);
      if (existingTab) {
        focusTabLeafForPage(existingTab.id, pageId);
        get().setActiveTab(existingTab.id);
        return;
      }

      get().openInCurrentTab(pageId);
    },

    syncTabPageId: (tabId: string, pageId: string) => {
      const { openTabs } = get();
      const tab = openTabs.find((item) => item.id === tabId);
      if (!tab || isSpecialTab(tab) || tab.pageId === pageId) return;
      const page = usePages.getState().getPage(pageId);
      if (!page || page.isFolder || page.trashedAt) return;
      set({
        openTabs: openTabs.map((item) =>
          item.id === tabId
            ? { ...item, pageId, workspaceId: page.workspaceId }
            : item,
        ),
      });
    },

    setActiveTab: (tabId: string) => {
      const { openTabs, activeTabId } = get();
      const tab = openTabs.find((item) => item.id === tabId);
      if (!tab) return;
      if (effectiveSingleTabMode()) {
        if (tab.type === "welcome") {
          void replaceWithSingleWelcome();
        } else if (!isSpecialTab(tab)) {
          void replaceWithSinglePage(tab.pageId);
        }
        return;
      }
      if (tab.id !== activeTabId) commitActiveEditor();

      const now = Date.now();
      set({
        openTabs: openTabs.map((item) =>
          item.id === tab.id || item.id === activeTabId
            ? stampTabAccess(item, now)
            : item,
        ),
        activeTabId: tab.id,
      });
      ensureSplitForWorkspaceTab(tab);
      pushTabHistory(tab.id);
      if (tab.type === "welcome") {
        void scheduleSetActivePage(null);
        return;
      }
      if (tab.type === "notebook-ai") {
        const notebookId = tab.workspaceId;
        if (notebookId) {
          const notebookStore = useNotebooks.getState();
          if (notebookStore.activeNotebookId !== notebookId) {
            notebookStore.setActiveNotebook(notebookId);
          }
        }
        return;
      }
      get().syncNotebookForPage(workspaceTabPageId(tab));
      void scheduleSetActivePage(workspaceTabPageId(tab));
    },
  };
}
