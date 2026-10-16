import type { TabSet, TabGet, TabsState, TabItem } from "./types";
import type { TabsActionContext } from "./context";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import {
  commitActiveEditor,
  createTabId,
  stampTabAccess,
  findNotebookAiTabInList,
} from "./helpers";
import { WELCOME_TAB_PAGE_ID, getNotebookAiTabPageId } from "./types";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { useNotebooks } from "../useNotebooks";
import { usePages } from "../usePages";
import { useEditorSplit } from "../useEditorSplit";
import { focusNewPage } from "../pages/actions/create/content";
import { toast } from "@/components/ui/sonner";

export function createSpecialTabActions(
  set: TabSet,
  get: TabGet,
  context: TabsActionContext,
): Pick<
  TabsState,
  | "openWelcomeTab"
  | "openNewTab"
  | "findNotebookAiTab"
  | "openNotebookAiTab"
  | "closeNotebookAiTab"
> {
  const { pushTabHistory, replaceWithSingleWelcome } = context;
  return {
    openWelcomeTab: () => {
      if (effectiveSingleTabMode()) {
        void replaceWithSingleWelcome();
        return;
      }
      const { openTabs } = get();
      // 复用已有的欢迎 tab（同时只存在一个）
      const existingWelcome = openTabs.find((tab) => tab.type === "welcome");
      if (existingWelcome) {
        get().setActiveTab(existingWelcome.id);
        return;
      }

      commitActiveEditor();
      const now = Date.now();
      const newTab: TabItem = {
        id: createTabId(WELCOME_TAB_PAGE_ID),
        pageId: WELCOME_TAB_PAGE_ID,
        type: "welcome",
        lastAccessedAt: now,
      };
      const nextOpenTabs = [
        ...openTabs.map((tab) =>
          tab.id === get().activeTabId ? stampTabAccess(tab, now) : tab,
        ),
        newTab,
      ];
      set({
        openTabs: nextOpenTabs,
        activeTabId: newTab.id,
      });
      pushTabHistory(newTab.id);
      // 欢迎 tab 不关联真实页面，不调用 syncNotebookForPage / scheduleSetActivePage
    },

    openNewTab: () => {
      if (!isElectronRuntime()) {
        get().openWelcomeTab();
        return;
      }
      const notebooksStore = useNotebooks.getState();
      const workspaceId = notebooksStore.activeNotebookId;
      const notebook = workspaceId
        ? notebooksStore.notebooks[workspaceId]
        : undefined;
      if (!workspaceId || notebook?.source !== "local-folder") {
        get().openWelcomeTab();
        return;
      }
      const { activeTabId, openTabs } = get();
      const activeTab = openTabs.find((tab) => tab.id === activeTabId);
      const sourcePageId = activeTab && !activeTab.type
        ? useEditorSplit.getState().focusedPageId(activeTab.id) ?? activeTab.pageId
        : null;
      const source = sourcePageId ? usePages.getState().getPage(sourcePageId) : undefined;
      const siblingSource = source?.workspaceId === workspaceId && !source.isFolder && !source.trashedAt
        ? source.id
        : null;
      const pageId = usePages.getState().createEditorDraftPage(siblingSource, workspaceId);
      if (!pageId) {
        toast.error("无法打开空白标签页");
        return;
      }
      get().openPermanentTab(pageId, { reuseEmpty: false });
      focusNewPage(pageId);
    },

    findNotebookAiTab: (notebookId: string) =>
      findNotebookAiTabInList(get().openTabs, notebookId),

    openNotebookAiTab: (notebookId: string) => {
      if (!notebookId) return;
      if (effectiveSingleTabMode()) return;
      const { openTabs, activeTabId } = get();
      const existing = findNotebookAiTabInList(openTabs, notebookId);
      if (existing) {
        if (existing.id !== activeTabId) {
          get().setActiveTab(existing.id);
        }
        return;
      }

      commitActiveEditor();
      const now = Date.now();
      const pageId = getNotebookAiTabPageId(notebookId);
      const newTab: TabItem = {
        id: createTabId(pageId),
        pageId,
        type: "notebook-ai",
        workspaceId: notebookId,
        lastAccessedAt: now,
      };
      // 独立 AI 标签放在最前，贴近「标签栏最左入口」。
      const nextOpenTabs = [
        newTab,
        ...openTabs.map((tab) =>
          tab.id === activeTabId ? stampTabAccess(tab, now) : tab,
        ),
      ];
      set({
        openTabs: nextOpenTabs,
        activeTabId: newTab.id,
      });
      pushTabHistory(newTab.id);
      const notebookStore = useNotebooks.getState();
      if (notebookStore.activeNotebookId !== notebookId) {
        notebookStore.setActiveNotebook(notebookId);
      }
    },

    closeNotebookAiTab: (notebookId: string) => {
      if (!notebookId) return;
      const existing = findNotebookAiTabInList(get().openTabs, notebookId);
      if (existing) {
        get().closeTab(existing.id);
      }
    },
  };
}
