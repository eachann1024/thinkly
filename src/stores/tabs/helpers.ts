import { common } from "@/i18n/common";
import { createTranslator as extraTranslator, getLocale, i18nYaml } from "@/i18n/core";
const extraText = extraTranslator(i18nYaml<"src/stores/tabs/helpers.ts#block1:1">`
zh-Hans:
  saveFailed: "「{{title}}」未能保存到磁盘"
  saveIncomplete: "本地页面保存未完成：{{id}}"
  confirmationRequired: "恢复内容需要确认，请重新打开笔记并解决冲突后再保存。"
  pageUnavailable: "笔记已删除或不可用，请先恢复笔记后重试。"
en:
  saveFailed: "“{{title}}” couldn’t be saved to disk"
  saveIncomplete: "The local page has not finished saving: {{id}}"
  confirmationRequired: "Recovered content needs confirmation. Reopen the note and resolve the conflict before saving."
  pageUnavailable: "This note was deleted or is unavailable. Restore it before retrying."
ja:
  saveFailed: "「{{title}}」をディスクに保存できませんでした"
  saveIncomplete: "ローカルページの保存が完了していません：{{id}}"
  confirmationRequired: "復元した内容の確認が必要です。ノートを再度開き、競合を解決してから保存してください。"
  pageUnavailable: "ノートが削除されたか利用できません。復元してから再試行してください。"
`);
import { usePages } from "../usePages";
import type { TabItem } from "./types";
import { useEditorSplit } from "../useEditorSplit";
import { walkLeaves } from "@/lib/editor-split/tree";
import { isSpecialTab, getNotebookAiTabPageId } from "./types";
import { getPendingLocalSaveContent, isRecoveredLocalSaveConfirmationRequired } from "../pages/folderSync";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { dismissSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { describeDiskWriteError } from "@/lib/diskWriteError";
import { showSaveRecoveryNotice } from "@/lib/save-recovery-notice";

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
      const hasPendingSave = getPendingLocalSaveContent(pageId) !== undefined;
      const confirmationRequired = isRecoveredLocalSaveConfirmationRequired(pageId);
      const flushFailed = Boolean(flushError);
      const noticeId = `goose-closed-page-save-failed:${pageId}`;
      if (!stillDirty && !hasPendingSave && !confirmationRequired && !flushFailed) {
        dismissSaveRecoveryNotice(noticeId);
      } else {
        const page = usePages.getState().getPage(pageId);
        const title = page ? getPageTitle(page) : pageId;
        showSaveRecoveryNotice({
          id: noticeId,
          title: extraText("saveFailed", { title }),
          description: confirmationRequired
            ? extraText("confirmationRequired")
            : describeDiskWriteError(
                flushError ?? new Error(extraText("saveIncomplete", { id: pageId })),
              ),
          retryLabel: common("retry"),
          onRetry: async () => {
            if (isRecoveredLocalSaveConfirmationRequired(pageId)) {
              throw new Error(extraText("confirmationRequired"));
            }
            const page = usePages.getState().getPage(pageId);
            if (!page || page.trashedAt) {
              throw new Error(extraText("pageUnavailable"));
            }
            if (isRecoveredLocalSaveConfirmationRequired(pageId)) {
              throw new Error(extraText("saveIncomplete", { id: pageId }));
            }
            await usePages.getState().flushPendingLocalSaveByPageId(pageId);
            if (
              isRecoveredLocalSaveConfirmationRequired(pageId) ||
              usePages.getState().dirtyLocalPageIds[pageId] ||
              getPendingLocalSaveContent(pageId) !== undefined
            ) {
              throw new Error(extraText("saveIncomplete", { id: pageId }));
            }
          },
          onRetryFailure: describeDiskWriteError,
          onReopenFailure: describeDiskWriteError,
          reopenLabel:
            getLocale() === "en"
              ? "Reopen"
              : getLocale() === "ja"
                ? "再度開く"
                : "重新打开",
          onReopen: async () => {
            const page = usePages.getState().getPage(pageId);
            if (!page || page.trashedAt) {
              throw new Error(extraText("pageUnavailable"));
            }
            const { useTabs } = await import("@/stores/useTabs");
            useTabs.setState((state) => ({
              recentlyClosedPageIds: state.recentlyClosedPageIds.filter(
                (id) => id !== pageId,
              ),
            }));
            useTabs.getState().openPermanentTab(pageId);
          },
        });
      }
    }),
  ).catch((error) => {
    console.error("[tabs] closed pages flush failed", error);
  });
};

export let setActivePageChain: Promise<void> = Promise.resolve();
let activePageRequest = 0;

export const cancelScheduledActivePage = () => {
  ++activePageRequest;
};

export const scheduleSetActivePage = (pageId: string | null) => {
  const request = ++activePageRequest;
  setActivePageChain = setActivePageChain
    .catch(() => {})
    .then(() => {
      if (request === activePageRequest) usePages.getState().setActivePage(pageId);
    });
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
