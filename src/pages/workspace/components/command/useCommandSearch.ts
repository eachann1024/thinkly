import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useNotebooks } from "@/stores/useNotebooks";
import { isPinyinQuery, pinyinMatchIndices } from "@/lib/pinyin-search";
import { compareTitleMatchRank } from "./commandSearchRank";
import { searchIndex } from "./pageSearchIndex";
import {
  filterCatalogByScope,
  getSearchCatalog,
  syncSearchCatalog,
} from "./pageSearchCatalog";

import { getContentSnippet, countLiteralMatches } from "./commandSearchText";
export { getContentSnippet, countLiteralMatches } from "./commandSearchText";

import { getSearchBodyText } from "./searchBodyCache";
export { getCachedText, getSearchBodyText } from "./searchBodyCache";

export interface SearchResultPage extends Page {
  contentSnippet?: string;
  snippetMatchIndex?: number;
  literalBodyMatchCount?: number;
  titleMatchCount?: number;
  matchKind?: "literal" | "token" | "pinyin" | "title";
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
  const deferredQuery = useDeferredValue(searchQuery);
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

  const allMatches = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();

    if (!query) {
      return { all: filteredPages as SearchResultPage[], recentCandidates: filteredPages as SearchResultPage[] };
    }

    // 构建 filteredPages 的 id 集合（已按 notebook/trash 过滤）
    const filteredSet = new Map<string, Page>();
    for (const page of filteredPages) {
      filteredSet.set(page.id, page);
    }

    // 倒排索引查询，返回按相关度排序的 id 列表
    const indexHitOrder = searchIndex(deferredQuery.trim());
    const exactHitIds = new Set<string>();
    for (const [id, page] of filteredSet) {
      const title = getPageTitle(page);
      if (countLiteralMatches(title, query) > 0 || countLiteralMatches(getSearchBodyText(page), query) > 0) exactHitIds.add(id);
    }
    // Exact literal fallback preserves punctuation queries MiniSearch tokenization can discard.
    const indexedIds = new Set(indexHitOrder);
    const orderedHitIds: string[] = [...indexHitOrder, ...[...exactHitIds].filter((id) => !indexedIds.has(id))];
    const indexHitIds = new Set<string>(orderedHitIds);

    // pinyin 补充命中（倒排索引不含拼音，需额外一轮）
    const pinyinHitIds = new Set<string>();
    if (isPinyinQuery(deferredQuery.trim())) {
      for (const [id, page] of filteredSet) {
        if (!indexHitIds.has(id)) {
          const title = getPageTitle(page);
          if (pinyinMatchIndices(title, deferredQuery.trim()) !== null) {
            pinyinHitIds.add(id);
          }
        }
      }
    }

    // 合并命中集（索引在前，拼音补充在后）
    const matched: SearchResultPage[] = [];

    // 先按索引相关度顺序添加
    for (const id of orderedHitIds) {
      const page = filteredSet.get(id);
      if (!page) continue;
      const resultPage: SearchResultPage = { ...page };
      const contentText = getSearchBodyText(page);
      const title = getPageTitle(page);
      const snippetResult = getContentSnippet(contentText, query);
      const titleSnippet = getContentSnippet(title, query);
      resultPage.literalBodyMatchCount = countLiteralMatches(contentText, query);
      resultPage.titleMatchCount = countLiteralMatches(title, query);
      resultPage.matchKind = snippetResult ? "literal" : titleSnippet ? "title" : "token";
      if (snippetResult) {
        resultPage.contentSnippet = snippetResult.snippet;
        resultPage.snippetMatchIndex = snippetResult.matchIndex;
      } else if (titleSnippet) {
        resultPage.contentSnippet = titleSnippet.snippet;
        resultPage.snippetMatchIndex = titleSnippet.matchIndex;
      } else {
        resultPage.contentSnippet = contentText.slice(0, 100);
      }
      matched.push(resultPage);
    }

    // 再追加 pinyin 专属命中
    for (const id of pinyinHitIds) {
      const page = filteredSet.get(id);
      if (!page) continue;
      const pageTitle = getPageTitle(page);
      const contentText = getSearchBodyText(page);
      const snippetResult = getContentSnippet(contentText, query);
      matched.push({
        ...page,
        contentSnippet: snippetResult?.snippet ?? contentText.slice(0, 100),
        snippetMatchIndex: snippetResult?.matchIndex,
        literalBodyMatchCount: countLiteralMatches(contentText, query),
        titleMatchCount: countLiteralMatches(pageTitle, query),
        matchKind: snippetResult ? "literal" : "pinyin",
      });
    }

    // 标题全匹配 / 前缀优先，同档保持 MiniSearch 相关度（不要按字母序重排）
    const all = [...matched].sort((a, b) =>
      compareTitleMatchRank(getPageTitle(a), getPageTitle(b), query),
    );

    return { all, recentCandidates: matched };
  }, [filteredPages, deferredQuery]);

  const recent = useMemo(() => {
    const excluded = new Set(removedRecentIds);
    return allMatches.recentCandidates.filter(page => !excluded.has(page.id))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
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
    setSearchQuery,
    removeRecent,
    loadMoreResults,
  };
}
