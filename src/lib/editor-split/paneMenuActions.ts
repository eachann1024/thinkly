import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/editor-split/paneMenuActions.ts#localMessages:1">`
zh-Hans:
  linkCopied: "已复制笔记链接"
  copyFailed: "复制笔记链接失败"
en:
  linkCopied: "Note link copied"
  copyFailed: "Couldn’t copy the note link"
ja:
  linkCopied: "ノートのリンクをコピーしました"
  copyFailed: "ノートのリンクをコピーできませんでした"
`;
const uiText = createTranslator(localMessages);
import {
  serializePageMentionMarkdown,
  wikiTargetFromReference,
} from "@/components/editor/inline/pageMention";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { toast } from "@/components/ui/sonner";
import { shell } from "@/lib/electron-platform/shell";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { flushEditorContent, usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { isSpecialTab, useTabs } from "@/stores/useTabs";
import { createTabId } from "@/stores/tabs/helpers";
import type { TabItem } from "@/stores/tabs/types";
import type { Page } from "@/types";
import { useEditorSplit } from "@/stores/useEditorSplit";
import { discardFailedSplitPage } from "./createBlankPage";
import {
  planMovePaneToNewTab,
  retainOnlyPane,
  writeMaximizedPane,
} from "./paneMaximize";
import { findLeaf, walkLeaves } from "./tree";
import { splitPaneAcceptsPage } from "./panePage";
import {
  replacedDraftStillReferenced,
  type OpenedPagePlace,
} from "./pageReferences";

export function collectOpenedPagePlaces(): OpenedPagePlace[] {
  return useTabs.getState().openTabs.flatMap((tab) => {
    if (isSpecialTab(tab)) return [];
    const split = useEditorSplit.getState().getStateForTab(tab.id);
    return [{
      tabId: tab.id,
      pageId: tab.pageId,
      leafPageIds: split ? walkLeaves(split.root).map((leaf) => leaf.pageId) : [],
    }];
  });
}

function discardUnreferenced(pageId: string, tabId: string) {
  if (replacedDraftStillReferenced(pageId, collectOpenedPagePlaces(), tabId)) return;
  discardFailedSplitPage(pageId);
}

export function closeOtherSplitPanes(tabId: string, leafId: string): boolean {
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tabId);
  if (!state) return false;
  const next = retainOnlyPane(state, leafId);
  if (!next || next === state) return false;
  const removed = walkLeaves(state.root).filter((leaf) => leaf.id !== leafId);
  flushEditorContent(true);
  useEditorSplit.setState((store) => ({
    byTabId: { ...store.byTabId, [tabId]: next },
    maximizedPaneIdByTab: writeMaximizedPane(store.maximizedPaneIdByTab, tabId, null),
  }));
  const keptId = findLeaf(next.root, leafId)?.pageId;
  if (keptId) useTabs.getState().syncTabPageId(tabId, keptId);
  if (useTabs.getState().activeTabId === tabId && keptId) {
    void usePages.getState().setActivePage(keptId);
  }
  for (const leaf of removed) discardUnreferenced(leaf.pageId, tabId);
  return true;
}

function appendTab(page: Page, tabId: string) {
  const tab: TabItem = {
    id: tabId,
    pageId: page.id,
    workspaceId: page.workspaceId,
    preview: false,
    lastAccessedAt: Date.now(),
  };
  useTabs.setState((store) => ({ openTabs: [...store.openTabs, tab] }));
  useTabs.getState().setActiveTab(tab.id);
}

/** 移出分屏后再开标签。空草稿不能走关标签的丢弃，否则新标签会指向已删页面。 */
export function moveSplitPaneToNewTab(tabId: string, leafId: string): boolean {
  if (effectiveSingleTabMode()) return false;
  const split = useEditorSplit.getState();
  const state = split.getStateForTab(tabId);
  if (!state) return false;
  const leaf = findLeaf(state.root, leafId);
  if (!leaf) return false;
  const page = usePages.getState().getPage(leaf.pageId);
  if (!splitPaneAcceptsPage(page)) return false;

  const tabs = useTabs.getState().openTabs.flatMap((tab) =>
    isSpecialTab(tab) ? [] : [{ id: tab.id, pageId: tab.pageId }],
  );
  const newTabId = createTabId(page.id);
  const plan = planMovePaneToNewTab({ tabId, leafId, state, tabs, newTabId });
  if (!plan) return false;

  flushEditorContent(true);
  if (plan.removeTabId) {
    appendTab(page, plan.activeTabId);
    useTabs.getState().releaseTab(plan.removeTabId);
    return useTabs.getState().activeTabId === plan.activeTabId;
  }

  split.closePane(tabId, leafId);
  if (plan.sourceTabPageId) {
    useTabs.getState().syncTabPageId(tabId, plan.sourceTabPageId);
  }
  appendTab(page, plan.activeTabId);
  return useTabs.getState().activeTabId === plan.activeTabId;
}

export async function copySplitPaneNoteLink(page: Page): Promise<boolean> {
  const title = getPageTitle(page);
  const notebookName = useNotebooks.getState().notebooks[page.workspaceId]?.name ?? "";
  const markdown = serializePageMentionMarkdown({
    pageId: page.id,
    workspaceId: page.workspaceId,
    title,
    notebookName,
    wikiTarget: wikiTargetFromReference({
      title,
      localFilePath: page.localFilePath,
    }) || title,
  });
  try {
    shell.copyText(markdown);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
    }
    toast.success(uiText("linkCopied"));
    return true;
  } catch {
    toast.error(uiText("copyFailed"));
    return false;
  }
}
