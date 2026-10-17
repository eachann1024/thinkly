import { useLocale } from "@/i18n";
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useNotebooks } from "@/stores/useNotebooks";
import { isCommandSearchablePage, shouldIncludePageInCommandScope } from "../command/searchPageFilter";
import { useCommandSearch, type SearchResultPage } from "../command/useCommandSearch";
import { useSearchSession } from "../sidebar/useSearchSession";
import { useSearchFolderRefresh } from "../sidebar/useSearchFolderRefresh";
import type { Page } from "@/types";

const EMPTY_PAGES: Record<string, Page> = {};

const isTitleMatch = (page: SearchResultPage) =>
  page.matchKind === "title" || page.matchKind === "pinyin" || (page.titleMatchCount ?? 0) > 0;

/** 复用全局搜索引擎，在其结果上叠加「仅标题」与「最近编辑」排序。 */
export function useSheetResults() {
  useLocale();
  const s = useSearchSession(useShallow(state => ({ open: state.view.phase !== "closed", query: state.query, scope: state.scope, titleOnly: state.titleOnly, sort: state.sort })));
  const pages = usePages(state => s.open ? state.pages : EMPTY_PAGES);
  const showRecent = useSettings(state => state.showRecentInSearch);
  const { loading, loadError, retryLoad } = useSearchFolderRefresh(s.open, s.scope);
  const scopedId = s.scope.kind === "all" ? null : s.scope.notebookId;
  const search = useCommandSearch({ enabled: s.open, searchQuery: s.query, pages, activeNotebookId: scopedId, searchAllNotebooks: s.scope.kind === "all" });
  const { searchResults, deferredQuery } = search;
  const hasResultQuery = Boolean(deferredQuery.trim());
  const filtered = useMemo(() => {
    if (!hasResultQuery) return null;
    if (!s.titleOnly && s.sort === "best") return null;
    const list = s.titleOnly ? searchResults.all.filter(isTitleMatch) : searchResults.all;
    return s.sort === "recent" ? [...list].sort((a, b) => b.updatedAt - a.updatedAt) : list;
  }, [hasResultQuery, s.titleOnly, s.sort, searchResults.all]);
  const limit = searchResults.allDisplay.length;
  const results = useMemo(() => !hasResultQuery ? (showRecent ? searchResults.recent : [])
    : filtered ? filtered.slice(0, limit) : searchResults.allDisplay,
  [hasResultQuery, showRecent, searchResults.recent, searchResults.allDisplay, filtered, limit]);
  const notebooks = useNotebooks(state => state.notebooks);
  const getCandidates = useCallback(() => Object.values(pages).filter(page => isCommandSearchablePage(page, notebooks) &&
    (scopedId ? page.workspaceId === scopedId : shouldIncludePageInCommandScope(page, notebooks, true, null))), [pages, notebooks, scopedId]);
  return {
    ...search, getCandidates, pages, loading, loadError, retryLoad, results, showRecent,
    total: filtered ? filtered.length : searchResults.all.length,
    hasMore: hasResultQuery && (filtered ? filtered.length > limit : searchResults.hasMore),
  };
}
