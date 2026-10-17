import { createTranslator as extraTranslator, i18nYaml } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/tabs/helpers.ts#block1:1">`
zh-Hans:
  saveFailed: "「{{title}}」未能保存到磁盘"
  saveIncomplete: "本地页面保存未完成：{{id}}"
en:
  saveFailed: "“{{title}}” couldn’t be saved to disk"
  saveIncomplete: "The local page has not finished saving: {{id}}"
ja:
  saveFailed: "「{{title}}」をディスクに保存できませんでした"
  saveIncomplete: "ローカルページの保存が完了していません：{{id}}"
`);
import { usePages } from "../usePages";
import type { TabItem } from "./types";
import { useEditorSplit } from "../useEditorSplit";
import { walkLeaves } from "@/lib/editor-split/tree";
import { isSpecialTab, getNotebookAiTabPageId } from "./types";
import { isRecoveredLocalSaveConfirmationRequired } from "../pages/folderSync";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { toast } from "@/components/ui/sonner";
import { describeDiskWriteError } from "@/lib/diskWriteError";

export const createTabId = (pageId: string) =>
  `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${pageId.slice(0, 6)}`;

export const getWorkspaceIdForPage = (pageId: string): string | undefined =>
  usePages.getState().getPage(pageId)?.workspaceId;

export function tabShowsPageId(tab: TabItem, pageId: string): boolean {
  if (tab.type === "welcome" || tab.type === "notebook-ai") return false;
  if (tab.pageId === pageId) return true;
  const split = useEditorSplit.getState().getStateForTab(tab.id);
  if (!split) return false;
  return walkLeaves(split.root).some((leaf) => leaf.pageId === pageId);
}

export const findTabByPageId = (tabs: TabItem[], pageId: string) =>
  tabs.find((tab) => tabShowsPageId(tab, pageId));

/**
 * 被删页如果只占分屏里的一部分格子，关掉这些格子并保留标签。
 * 整页只剩这一页时交给调用方关标签。
 */
export function closeSplitLeavesForDeletedPage(
  tabId: string,
  pageId: string,
): "close-tab" | "closed-pane" | "none" {
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tabId);
  if (!state) return "none";
  const leaves = walkLeaves(state.root);
  const matching = leaves.filter((leaf) => leaf.pageId === pageId);
  if (matching.length === 0) return "none";
  if (matching.length === leaves.length) return "close-tab";

  for (const leaf of matching) {
    const result = split.closePane(tabId, leaf.id);
    if (result.kind === "last-pane") return "close-tab";
  }
  return "closed-pane";
}

/** 关 Tab 时把聚焦页和所有分屏叶一起落盘，避免只 flush tab.pageId。 */
export function collectTabPageIds(tab: TabItem): string[] {
  const ids = new Set<string>();
  if (tab.pageId) ids.add(tab.pageId);
  const split = useEditorSplit.getState().getStateForTab(tab.id);
  if (split) {
    for (const leaf of walkLeaves(split.root)) {
      if (leaf.pageId) ids.add(leaf.pageId);
    }
  }
  return [...ids];
}

export function collectTabsPageIds(tabs: TabItem[]): string[] {
  const ids = new Set<string>();
  for (const tab of tabs) {
    if (isSpecialTab(tab)) continue;
    for (const pageId of collectTabPageIds(tab)) ids.add(pageId);
  }
  return [...ids];
}

export function focusTabLeafForPage(tabId: string, pageId: string): void {
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tabId);
  if (!state) return;
  const leaf = walkLeaves(state.root).find((item) => item.pageId === pageId);
  if (leaf) split.focusPane(tabId, leaf.id);
}

/** 打开/激活工作区 tab 时立刻种 split，避免 EditorSplitSurface 第一帧空白。 */
export function ensureSplitForWorkspaceTab(
  tab: TabItem | null | undefined,
): void {
  if (!tab || isSpecialTab(tab) || !tab.pageId) return;
  useEditorSplit.getState().ensureTab(tab.id, tab.pageId);
}

export const findNotebookAiTabInList = (tabs: TabItem[], notebookId: string) =>
  tabs.find(
    (tab) =>
      tab.type === "notebook-ai" &&
      (tab.workspaceId === notebookId ||
        tab.pageId === getNotebookAiTabPageId(notebookId)),
  );

export const stampTabAccess = (tab: TabItem, now = Date.now()): TabItem => ({
  ...tab,
  lastAccessedAt: now,
});

/** 分屏 tab 以聚焦叶的 pageId 为准，避免切回标签时侧栏高亮停在旧页。 */
export function workspaceTabPageId(tab: TabItem): string {
  return useEditorSplit.getState().focusedPageId(tab.id) ?? tab.pageId;
}

export function syncEditorSplitsToOpenTabs(
  openTabs: TabItem[],
  activeTabId: string | null,
) {
  const split = useEditorSplit.getState();
  const openIds = new Set(openTabs.map((tab) => tab.id));
  for (const tabId of Object.keys(split.byTabId)) {
    if (!openIds.has(tabId)) split.clearTab(tabId);
  }
  const active = openTabs.find((tab) => tab.id === activeTabId);
  ensureSplitForWorkspaceTab(active);
}

// 提交当前编辑器内容（切换/关闭标签前调用），确保未防抖落盘的编辑不丢。
export const commitActiveEditor = () => {
  if (typeof window === "undefined") return;
  const EventConstructor = window.CustomEvent ?? globalThis.CustomEvent;
  if (typeof EventConstructor !== "function") return;
  window.dispatchEvent(
    new EventConstructor("goose-note:flush-editor", {
      detail: { immediate: true },
    }),
  );
};

// 对被关闭的页面执行 flush，完成后若仍 dirty（写盘失败）则 toast 警告一次。
// 冲突场景下 write.ts 会 dispatch goose-note:local-file-conflict，
// useLocalFolderWatch 已有 showConflictToast 处理，此处统一 toast 也可接受（不删冲突 UX）。
export const flushClosedPageSaves = (pageIds: string[]): void => {
  if (pageIds.length === 0) return;
  const pagesStore = usePages.getState();
  void Promise.all(
    pageIds.map(async (pageId) => {
      let flushError: unknown;
      try {
        await pagesStore.flushPendingLocalSaveByPageId(pageId);
      } catch (error) {
        flushError = error;
        console.error("[tabs] closed page flush failed", pageId, error);
      }
      const stillDirty = usePages.getState().dirtyLocalPageIds[pageId];
      if (stillDirty && !isRecoveredLocalSaveConfirmationRequired(pageId)) {
        const page = usePages.getState().getPage(pageId);
        const title = page ? getPageTitle(page) : pageId;
        toast.warning(extraText("saveFailed", { title }), {
          description: describeDiskWriteError(
            flushError ?? new Error(extraText("saveIncomplete", { id: pageId })),
          ),
        });
      }
    }),
  ).catch((error) => {
    // 单页错误已在任务内消费；这里仅兜底，避免关闭标签时产生未处理拒绝。
    console.error("[tabs] closed pages flush failed", error);
  });
};

export let setActivePageChain: Promise<void> = Promise.resolve();

export const scheduleSetActivePage = (pageId: string | null) => {
  setActivePageChain = setActivePageChain
    .catch(() => {})
    .then(() => usePages.getState().setActivePage(pageId));
  return setActivePageChain;
};

export const clampHistoryIndex = (
  historyLength: number,
  currentIndex: number,
) => {
  if (historyLength === 0) return -1;
  if (currentIndex < 0) return 0;
  return Math.min(currentIndex, historyLength - 1);
};
