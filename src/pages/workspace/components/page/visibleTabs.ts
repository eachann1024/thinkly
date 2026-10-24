import {
  isUnsavedEditorPage,
  localPageHasPersistableContent,
} from "@/lib/unsavedLocalPage";
import type { Page } from "@/types";
import type { TabItem } from "@/stores/useTabs";

export function isWorkspaceTabVisible(
  tab: TabItem,
  getPage: (id: string) => Page | undefined,
  _activeNotebookId: string | null | undefined,
): boolean {
  if (tab.type === "notebook-ai") return false;
  if (tab.type === "welcome") return true;
  const tabPage = getPage(tab.pageId);
  return !tabPage || !tabPage.trashedAt;
}

export function listVisibleWorkspaceTabs(
  openTabs: TabItem[],
  getPage: (id: string) => Page | undefined,
  activeNotebookId: string | null | undefined,
): TabItem[] {
  return openTabs.filter((tab) =>
    isWorkspaceTabVisible(tab, getPage, activeNotebookId),
  );
}

export function findLoneVisibleWorkspaceTab(
  openTabs: TabItem[],
  getPage: (id: string) => Page | undefined,
  notebookId: string | null | undefined,
): TabItem | null {
  const visible = listVisibleWorkspaceTabs(openTabs, getPage, notebookId);
  return visible.length === 1 ? visible[0] : null;
}

export function isReusableEmptyWorkspaceTab(
  tab: TabItem | null | undefined,
  getPage: (id: string) => Page | undefined,
): boolean {
  if (!tab) return false;
  if (tab.type === "notebook-ai") return false;
  if (tab.type === "welcome") return true;
  const page = getPage(tab.pageId);
  return Boolean(
    page &&
      isUnsavedEditorPage(page) &&
      !localPageHasPersistableContent(page.content),
  );
}
