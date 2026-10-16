import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useNotebooks } from "@/stores/useNotebooks";
import { computeCommandMatches, type CommandMatches } from "./cooperativeCommandSearch";
import type { SearchNotebooks } from "./pageSearchCatalog";
import { syncIndex } from "./pageSearchIndex";
import { useCommandSearchScope } from "./useCommandSearchScope";
import { useCommandSearchRecent } from "./useCommandSearchRecent";
import { isCommandSearchablePage, shouldIncludePageInCommandScope } from "./searchPageFilter";

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

export const SEARCH_RESULT_PAGE_SIZE = 30;
const EMPTY_NOTEBOOKS: SearchNotebooks = {};
const EMPTY_CHILDREN = new Set<string>();
const EMPTY_MATCHES: CommandMatches = { all: [], recentCandidates: [] };

interface CommandSearchState {
  searchQuery: string;
  pages: Record<string, Page>;
  activeNotebookId: string | null;
  searchAllNotebooks: boolean;
  enabled?: boolean;
}

export function useCommandSearch({
  searchQuery, pages, activeNotebookId, searchAllNotebooks, enabled = true,
}: CommandSearchState) {
  const deferredQuery = searchQuery;
  const notebooks = useNotebooks((state) => enabled ? state.notebooks : EMPTY_NOTEBOOKS);
  const [pagination, setPagination] = useState(() => ({
    query: searchQuery, searchAllNotebooks, activeNotebookId, limit: SEARCH_RESULT_PAGE_SIZE,
  }));
  const scopeChanged = pagination.query !== searchQuery ||
    pagination.searchAllNotebooks !== searchAllNotebooks ||
    pagination.activeNotebookId !== activeNotebookId;
  // Reset before children commit, so a new query never paints the old page limit.
  if (scopeChanged) {
    setPagination({ query: searchQuery, searchAllNotebooks, activeNotebookId,
      limit: SEARCH_RESULT_PAGE_SIZE });
  }
  const displayLimit = scopeChanged ? SEARCH_RESULT_PAGE_SIZE : pagination.limit;
  const [removedRecentIds, setRemovedRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("goose-recent-excludes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadMoreResults = useCallback(() => {
    setPagination((previous) => ({ ...previous, limit: previous.limit + SEARCH_RESULT_PAGE_SIZE }));
  }, []);
  const removeRecent = useCallback((id: string) => {
    const nextIds = [...removedRecentIds, id];
    setRemovedRecentIds(nextIds);
    localStorage.setItem("goose-recent-excludes", JSON.stringify(nextIds));
  }, [removedRecentIds]);

  const prepared = useCommandSearchScope(
    pages, notebooks, searchAllNotebooks, activeNotebookId, enabled,
  );
  const { scope: filteredPages, catalog, ready } = prepared;
  const getPageBreadcrumb = useCallback((page: Page): string[] => {
    const breadcrumb: string[] = [];
    let currentPage = page;
    while (currentPage) {
      const title = getPageTitle(currentPage);
      if (title && title !== "无标题") breadcrumb.unshift(title);
      if (!currentPage.parentId) break;
      currentPage = pages[currentPage.parentId];
    }
    const notebook = useNotebooks.getState().notebooks[page.workspaceId || "default"];
    if (notebook) breadcrumb.unshift(notebook.name);
    return breadcrumb;
  }, [pages]);

  const [completed, setCompleted] = useState<{
    query: string;
    pages: CommandSearchState["pages"];
    notebooks: SearchNotebooks;
    scope: Page[];
    matches: CommandMatches | null;
    error: string | null;
  } | null>(null);
  const latest = useRef({ query: searchQuery, pages, notebooks, scope: filteredPages, enabled });
  useLayoutEffect(() => {
    latest.current = { query: searchQuery, pages, notebooks, scope: filteredPages, enabled };
  }, [searchQuery, pages, notebooks, filteredPages, enabled]);
  const currentCompletion = enabled && completed?.query === searchQuery &&
    completed.pages === pages && completed.notebooks === notebooks &&
    completed.scope === filteredPages ? completed : null;

  useEffect(() => {
    if (!enabled || !searchQuery.trim() || !ready || !catalog || prepared.error || currentCompletion) return;
    const controller = new AbortController();
    const snapshot = { query: searchQuery, pages, notebooks, scope: filteredPages };
    const isCurrent = () => {
      const current = latest.current;
      return !controller.signal.aborted && current.enabled && current.query === snapshot.query &&
        current.pages === snapshot.pages && current.notebooks === snapshot.notebooks &&
        current.scope === snapshot.scope;
    };
    void (async () => {
      if (!await syncIndex(catalog) || !isCurrent()) return;
      const matches = await computeCommandMatches(
        filteredPages, searchQuery, controller.signal, catalog,
      );
      if (matches && isCurrent()) setCompleted({ ...snapshot, matches, error: null });
    })().catch((error: unknown) => {
      if (!isCurrent()) return;
      console.error("Command search failed", error);
      setCompleted({ ...snapshot, matches: null, error: "搜索失败，请修改关键词后重试" });
    });
    return () => { controller.abort(); };
  }, [enabled, ready, catalog, prepared.error, filteredPages, pages, notebooks, searchQuery, currentCompletion]);

  const hasQuery = Boolean(searchQuery.trim());
  const searchError = prepared.error ?? currentCompletion?.error ?? null;
  const preparing = enabled && !searchError && (!ready || (hasQuery && !currentCompletion));
  const liveMatches = useMemo<CommandMatches>(() => {
    if (!enabled || !ready || searchError) return EMPTY_MATCHES;
    if (!hasQuery) return { all: filteredPages, recentCandidates: filteredPages };
    return currentCompletion?.matches ?? EMPTY_MATCHES;
  }, [enabled, ready, hasQuery, filteredPages, currentCompletion, searchError]);
  const [retained, setRetained] = useState<{
    query: string; all: boolean; activeId: string | null;
    notebooks: SearchNotebooks; matches: CommandMatches;
  } | null>(null);
  const sameSession = retained?.query === searchQuery &&
    retained.all === searchAllNotebooks && retained.activeId === activeNotebookId &&
    retained.notebooks === notebooks;
  // Retain rows while refreshing the same session, with interaction blocked until ready.
  if (enabled && ready && !prepared.error && (!hasQuery || currentCompletion?.matches) &&
      (!sameSession || retained.matches.all !== liveMatches.all ||
        retained.matches.recentCandidates !== liveMatches.recentCandidates)) {
    setRetained({ query: searchQuery, all: searchAllNotebooks,
      activeId: activeNotebookId, notebooks, matches: liveMatches });
  }
  const allMatches = sameSession && (!enabled || preparing) ? retained.matches : liveMatches;
  const recentState = useCommandSearchRecent(allMatches.recentCandidates, removedRecentIds,
    enabled && !preparing && !searchError,
    JSON.stringify([searchQuery, searchAllNotebooks, activeNotebookId]));
  const recent = useMemo(() => searchError ? EMPTY_MATCHES.recentCandidates :
    recentState.recent.filter(page => isCommandSearchablePage(page, notebooks) &&
      shouldIncludePageInCommandScope(page, notebooks, searchAllNotebooks, activeNotebookId)),
  [searchError, recentState.recent, notebooks, searchAllNotebooks, activeNotebookId]);
  const isSearching = enabled && !searchError && (preparing || (!hasQuery && recentState.pending));
  const allDisplay = useMemo(() => allMatches.all.slice(0, displayLimit),
    [allMatches.all, displayLimit]);
  const searchResults: SearchResults = useMemo(() => {
    return { recent, all: allMatches.all, allDisplay, hasQuery,
      hasMore: allDisplay.length < allMatches.all.length };
  }, [allMatches.all, allDisplay, recent, hasQuery]);

  return {
    filteredPages, searchResults,
    pageIdsWithChildren: catalog?.pageIdsWithChildren ?? EMPTY_CHILDREN,
    getPageBreadcrumb, searchQuery, deferredQuery,
    completedQuery: currentCompletion?.matches ? currentCompletion.query : "",
    searchError,
    isSearching, removeRecent, loadMoreResults,
  };
}
