import { getPageTitle } from "@/components/editor/utils/page-title";
import { isCanonicalPathInside } from "@/lib/canonicalLocalPath";
import type { Page } from "@/types";

export type SearchNotebook = {
  source?: "default" | "local-folder";
  localPath?: string;
  localPathMissing?: boolean;
  excludeFromGlobalSearch?: boolean;
};

function belongsToSearchNotebook(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
): boolean {
  const notebook = notebooks[page.workspaceId];
  if (!notebook) return false;
  if (notebook.source !== "local-folder") return true;
  return Boolean(
    notebook.localPath && !notebook.localPathMissing && page.localFilePath &&
    isCanonicalPathInside(page.localFilePath, notebook.localPath),
  );
}

/** 搜索面板只收录可打开的笔记；local-folder 目录节点仅用于侧栏导航。 */
export function isCommandSearchablePage(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
): boolean {
  if (page.trashedAt || page.localUnsaved ||
      !belongsToSearchNotebook(page, notebooks)) return false;

  const title = getPageTitle(page);
  if (!title || title === "无标题") return false;

  return !(
    notebooks[page.workspaceId]?.source === "local-folder" && page.isFolder
  );
}

/**
 * 「所有记事本」搜索时，排除设置了 excludeFromGlobalSearch 的笔记本页面。
 * 当前正在看的记事本始终纳入，避免「当前本能搜到、切到所有反而没有」。
 * 当前本搜索不在这里拦截（由 activeNotebook 范围过滤负责）。
 */
export function shouldIncludePageInCommandScope(
  page: Page,
  notebooks: Record<string, SearchNotebook | undefined>,
  searchAllNotebooks: boolean,
  currentNotebookId?: string | null,
): boolean {
  if (!belongsToSearchNotebook(page, notebooks)) return false;
  if (!searchAllNotebooks) return true;
  if (currentNotebookId && page.workspaceId === currentNotebookId) return true;
  return !notebooks[page.workspaceId]?.excludeFromGlobalSearch;
}
