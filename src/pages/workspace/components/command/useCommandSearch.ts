import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useNotebooks } from "@/stores/useNotebooks";
import { computeCommandMatches, type CommandMatches } from "./cooperativeCommandSearch";
import {
  filterCatalogByScope,
  getSearchCatalog,
  syncSearchCatalog,
} from "./pageSearchCatalog";

export { getContentSnippet, countLiteralMatches } from "./commandSearchText";

export { getCachedText, getSearchBodyText } from "./searchBodyCache";

export interface SearchResultPage extends Page {
  contentSnippet?: string;
  snippetMatchIndex?: number;
  literalBodyMatchCount?: number;
  titleMatchCount?: number;
  matchKind?: "literal" | "pinyin" | "title";
}

export interface SearchResults {
  recent: SearchResultPage[];
  all: SearchResultPage[];
  /** 当前应渲染的结果切片，由 useCommandSearch 的 displayLimit 控制 */
  allDisplay: SearchResultPage[];
  hasQuery: boolean;
  hasMore: boolean;
}

/** 首屏与每次追加加载条数 */
export const SEARCH_RESULT_PAGE_SIZE = 30;

interface CommandSearchState {
  pages: Record<string, Page>;
  activeNotebookId: string | null;
  searchAllNotebooks: boolean;
}

export function useCommandSearch({
  pages,
  activeNotebookId,
  searchAllNotebooks,
}: CommandSearchState) {
  const [searchQuery, setSearchQuery] = useState("");
  // Matching is scheduled outside render; this compatibility field follows input.
  const deferredQuery = searchQuery;
  const notebooks = useNotebooks((state) => state.notebooks);
  const [displayLimit, setDisplayLimit] = useState(SEARCH_RESULT_PAGE_SIZE);
  const [removedRecentIds, setRemovedRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("goose-recent-excludes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 查询 / 范围变化时重置分页，避免旧 limit 挂在新结果上
  useEffect(() => {
    setDisplayLimit(SEARCH_RESULT_PAGE_SIZE);
  }, [deferredQuery, searchAllNotebooks, activeNotebookId]);

  const loadMoreResults = useCallback(() => {
    setDisplayLimit((prev) => prev + SEARCH_RESULT_PAGE_SIZE);
  }, []);

  const removeRecent = useCallback((id: string) => {
    const newIds = [...removedRecentIds, id];
    setRemovedRecentIds(newIds);
    localStorage.setItem("goose-recent-excludes", JSON.stringify(newIds));
  }, [removedRecentIds]);

  const catalog = useMemo(() => {
    if (Object.keys(pages).length === 0) return getSearchCatalog();
    return syncSearchCatalog(pages, notebooks);
  }, [pages, notebooks]);

  const filteredPages = useMemo(
    () =>
      Object.keys(pages).length === 0
        ? []
        : filterCatalogByScope(
            catalog.sortedByTitle,
            notebooks,
            searchAllNotebooks,
            activeNotebookId,
          ),
    [pages, catalog, notebooks, searchAllNotebooks, activeNotebookId],
  );

  const getPageBreadcrumb = useCallback(
    (page: Page): string[] => {
      const breadcrumb: string[] = [];
      let currentPage = page;

      while (currentPage) {
        const title = getPageTitle(currentPage);
        if (title && title !== "无标题") {
          breadcrumb.unshift(title);
        }
        if (!currentPage.parentId) {
          break;
        }
        currentPage = pages[currentPage.parentId];
      }

      const notebookId = page.workspaceId || "default";
      const notebook = useNotebooks.getState().notebooks[notebookId];
      if (notebook) {
        breadcrumb.unshift(notebook.name);
      }

      return breadcrumb;
    },
    [pages],
  );

  const [completed, setCompleted] = useState<{
    query: string;
    pages: CommandSearchState["pages"];
    scope: Page[];
    matches: CommandMatches | null;
    error: string | null;
  } | null>(null);
  const latest = useRef({ query: searchQuery, pages, scope: filteredPages });
  useLayoutEffect(() => {
    latest.current = { query: searchQuery, pages, scope: filteredPages };
  }, [searchQuery, pages, filteredPages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCompleted(null);
      return;
    }
    const controller = new AbortController();
    const snapshot = { query: searchQuery, pages, scope: filteredPages };
    const isCurrent = () => {
      const current = latest.current;
      return !controller.signal.aborted && current.query === snapshot.query &&
        current.pages === snapshot.pages && current.scope === snapshot.scope;
    };
    // Let the input paint before the first scan, including the index query.
    const timer = setTimeout(() => {
      void computeCommandMatches(filteredPages, searchQuery, controller.signal)
        .then((matches) => {
          if (!matches || !isCurrent()) return;
          setCompleted({ ...snapshot, matches, error: null });
        })
        .catch((error: unknown) => {
          if (!isCurrent()) return;
          console.error("Command search failed", error);
          setCompleted({ ...snapshot, matches: null, error: "搜索失败，请修改关键词后重试" });
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filteredPages, pages, searchQuery]);

  const hasQuery = Boolean(searchQuery.trim());
  const currentCompletion = completed?.query === searchQuery &&
    completed.pages === pages && completed.scope === filteredPages ? completed : null;
  const isSearching = hasQuery && !currentCompletion;
  const allMatches = useMemo<CommandMatches>(() => {
    if (!hasQuery) return { all: filteredPages, recentCandidates: filteredPages };
    return currentCompletion?.matches ?? { all: [], recentCandidates: [] };
  }, [hasQuery, filteredPages, currentCompletion]);

  const recent = useMemo(() => {
    const excluded = new Set(removedRecentIds);
    const latestRecent: SearchResultPage[] = [];
    for (const page of allMatches.recentCandidates) {
      if (excluded.has(page.id)) continue;
      const index = latestRecent.findIndex(item => item.updatedAt < page.updatedAt);
      if (index >= 0) latestRecent.splice(index, 0, page);
      else if (latestRecent.length < 5) latestRecent.push(page);
      if (latestRecent.length > 5) latestRecent.pop();
    }
    return latestRecent;
  }, [allMatches, removedRecentIds]);
  const searchResults: SearchResults = useMemo(() => {
    const allDisplay = allMatches.all.slice(0, displayLimit);
    return { recent, all: allMatches.all, allDisplay,
      hasQuery: Boolean(deferredQuery.trim()), hasMore: allDisplay.length < allMatches.all.length };
  }, [allMatches, recent, displayLimit, deferredQuery]);

  return {
    filteredPages,
    searchResults,
    pageIdsWithChildren: catalog.pageIdsWithChildren,
    getPageBreadcrumb,
    searchQuery,
    deferredQuery,
    completedQuery: currentCompletion?.matches ? currentCompletion.query : "",
    searchError: currentCompletion?.error ?? null,
    isSearching,
    setSearchQuery,
    removeRecent,
    loadMoreResults,
  };
}
