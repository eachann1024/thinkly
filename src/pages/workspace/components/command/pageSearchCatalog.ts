/**
 * 全局搜索目录：空闲时预热 MiniSearch 索引 + 按标题排好的可搜页。
 *
 * CommandPalette 关闭时用空 pages 退订 store，避免侧栏/编辑改动拖着面板重渲染。
 * 空快照不得清掉已预热的目录和索引，否则每次 ⌘K 都要全量抽文本、重建倒排。
 */
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { DEFAULT_NOTEBOOK } from "@/stores/useNotebooks";
import { clearSearchBodyCache, pruneSearchBodyCache } from "./searchBodyCache";
import { syncIndex } from "./pageSearchIndex";
import {
  isCommandSearchablePage,
  shouldIncludePageInCommandScope,
  type SearchNotebook,
} from "./searchPageFilter";

export interface SearchCatalog {
  pagesRef: Record<string, Page> | null;
  sortedByTitle: Page[];
  pageIdsWithChildren: Set<string>;
}

const pageMetadata = new WeakMap<Page, string>();
let metadata = new Map<string, string>();
let notebookKey = "";

function notebookSignature(notebooks: Record<string, SearchNotebook | undefined>): string {
  return JSON.stringify(Object.keys(notebooks).sort().map(id =>
    [id, notebooks[id]?.source, notebooks[id]?.excludeFromGlobalSearch]));
}

function metadataSignature(page: Page): string {
  const cached = pageMetadata.get(page);
  if (cached !== undefined) return cached;
  const signature = JSON.stringify([getPageTitle(page), page.workspaceId,
    page.parentId, page.trashedAt, page.localUnsaved, page.isFolder]);
  pageMetadata.set(page, signature);
  return signature;
}

const EMPTY_CHILDREN = new Set<string>();

let catalog: SearchCatalog = {
  pagesRef: null,
  sortedByTitle: [],
  pageIdsWithChildren: EMPTY_CHILDREN,
};

export function getSearchCatalog(): SearchCatalog {
  return catalog;
}

export function resetSearchCatalog(): void {
  metadata = new Map();
  notebookKey = "";
  clearSearchBodyCache();
  catalog = {
    pagesRef: null,
    sortedByTitle: [],
    pageIdsWithChildren: EMPTY_CHILDREN,
  };
}

function toPagesRecord(pages: Page[]): Record<string, Page> {
  const record: Record<string, Page> = {};
  for (const page of pages) {
    record[page.id] = page;
  }
  return record;
}

export function syncSearchCatalog(
  pages: Record<string, Page>,
  notebooks: Record<string, SearchNotebook | undefined>,
): SearchCatalog {
  const nextNotebookKey = notebookSignature(notebooks);
  if (catalog.pagesRef === pages && nextNotebookKey === notebookKey) return catalog;

  // 面板关闭传入的空对象：保留上次预热结果
  if (Object.keys(pages).length === 0) return catalog;

  const nextMetadata = new Map<string, string>();
  let metadataChanged = notebookKey !== nextNotebookKey || metadata.size !== Object.keys(pages).length;
  for (const page of Object.values(pages)) {
    const signature = metadataSignature(page);
    nextMetadata.set(page.id, signature);
    if (metadata.get(page.id) !== signature) metadataChanged = true;
  }
  let sortedByTitle: Page[];
  let pageIdsWithChildren = catalog.pageIdsWithChildren;
  if (metadataChanged) {
    const decorated: { page: Page; title: string }[] = [];
    pageIdsWithChildren = new Set<string>();
    for (const page of Object.values(pages)) {
      if (!page.trashedAt && page.parentId) pageIdsWithChildren.add(page.parentId);
      if (isCommandSearchablePage(page, notebooks)) decorated.push({ page, title: getPageTitle(page) });
    }
    decorated.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    sortedByTitle = decorated.map(item => item.page);
  } else {
    // Order/structure are unchanged, but consumers must receive the latest content references.
    sortedByTitle = catalog.sortedByTitle.map(page => pages[page.id]);
  }
  metadata = nextMetadata;
  notebookKey = nextNotebookKey;
  pruneSearchBodyCache(new Set(nextMetadata.keys()));

  catalog = {
    pagesRef: pages,
    sortedByTitle,
    pageIdsWithChildren,
  };
  syncIndex(toPagesRecord(sortedByTitle));
  return catalog;
}

export function filterCatalogByScope(
  sortedByTitle: Page[],
  notebooks: Record<string, SearchNotebook | undefined>,
  searchAllNotebooks: boolean,
  activeNotebookId: string | null,
): Page[] {
  const currentNotebookId =
    activeNotebookId ||
    (typeof __HOST_TARGET__ !== "undefined" && __HOST_TARGET__ === "electron"
      ? "__no-notebook__"
      : DEFAULT_NOTEBOOK);

  const result: Page[] = [];
  for (const page of sortedByTitle) {
    if (
      !shouldIncludePageInCommandScope(
        page,
        notebooks,
        searchAllNotebooks,
        currentNotebookId,
      )
    ) {
      continue;
    }
    if (!searchAllNotebooks && page.workspaceId !== currentNotebookId) {
      continue;
    }
    result.push(page);
  }
  return result;
}
