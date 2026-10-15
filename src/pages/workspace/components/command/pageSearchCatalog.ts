/** Shared immutable search snapshots, maintained outside React render. */
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { clearSearchBodyCache, pruneSearchBodyCache } from "./searchBodyCache";
import { cancelIndexSync, resetIndex } from "./pageSearchIndex";
import { createSearchTaskBudget, sortSearchCatalog, yieldSearchTask } from "./searchTaskScheduling";
import {
  isCommandSearchablePage,
  shouldIncludePageInCommandScope,
  type SearchNotebook,
} from "./searchPageFilter";

export type SearchNotebooks = Record<string, SearchNotebook | undefined>;
export interface SearchCatalog {
  pagesRef: Record<string, Page> | null;
  notebooksRef: SearchNotebooks | null;
  sortedByTitle: Page[];
  pageIdsWithChildren: Set<string>;
}

const pageMetadata = new WeakMap<Page, string>();
const titleCollator = new Intl.Collator("zh-CN");
let metadata = new Map<string, string>();
const scopeCache = new WeakMap<Page[], Map<string, Page[]>>();
let notebookKey = "";
let pending: {
  pages: Record<string, Page>;
  notebooks: SearchNotebooks;
  controller: AbortController;
  promise: Promise<SearchCatalog | null>;
} | null = null;

function notebookSignature(notebooks: SearchNotebooks): string {
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

let catalog: SearchCatalog = {
  pagesRef: null, notebooksRef: null, sortedByTitle: [], pageIdsWithChildren: new Set(),
};

export function getSearchCatalog(): SearchCatalog {
  return catalog;
}

export function resetSearchCatalog(): void {
  pending?.controller.abort();
  pending = null;
  metadata = new Map();
  notebookKey = "";
  clearSearchBodyCache();
  resetIndex();
  catalog = {
    pagesRef: null, notebooksRef: null, sortedByTitle: [], pageIdsWithChildren: new Set(),
  };
}

async function buildCatalog(
  pages: Record<string, Page>,
  notebooks: SearchNotebooks,
  signal: AbortSignal,
): Promise<SearchCatalog | null> {
  await yieldSearchTask(signal, true);
  if (signal.aborted) return null;
  const previous = catalog;
  const nextNotebookKey = notebookSignature(notebooks);
  const nextMetadata = new Map<string, string>();
  let metadataChanged = notebookKey !== nextNotebookKey;
  const pause = createSearchTaskBudget(signal, true);
  for (const id in pages) {
    if (signal.aborted) return null;
    const signature = metadataSignature(pages[id]);
    nextMetadata.set(id, signature);
    if (metadata.get(id) !== signature) metadataChanged = true;
    const wait = pause();
    if (wait) await wait;
  }
  metadataChanged ||= metadata.size !== nextMetadata.size;
  const sortedByTitle: Page[] = [];
  let pageIdsWithChildren = previous.pageIdsWithChildren;
  if (metadataChanged) {
    const decorated: { page: Page; title: string }[] = [];
    pageIdsWithChildren = new Set();
    for (const id in pages) {
      if (signal.aborted) return null;
      const page = pages[id];
      if (!page.trashedAt && page.parentId) pageIdsWithChildren.add(page.parentId);
      if (isCommandSearchablePage(page, notebooks)) decorated.push({ page, title: getPageTitle(page) });
      const wait = pause();
      if (wait) await wait;
    }
    const sorted = await sortSearchCatalog(decorated,
      (a, b) => titleCollator.compare(a.title, b.title), signal);
    if (!sorted) return null;
    for (const item of sorted) {
      if (signal.aborted) return null;
      sortedByTitle.push(item.page);
      const wait = pause();
      if (wait) await wait;
    }
  } else {
    for (const page of previous.sortedByTitle) {
      if (signal.aborted) return null;
      sortedByTitle.push(pages[page.id]);
      const wait = pause();
      if (wait) await wait;
    }
  }
  if (signal.aborted) return null;
  metadata = nextMetadata;
  notebookKey = nextNotebookKey;
  pruneSearchBodyCache(nextMetadata);
  catalog = { pagesRef: pages, notebooksRef: notebooks, sortedByTitle, pageIdsWithChildren };
  return catalog;
}

/** Share identical work; a newer pages/notebooks snapshot cancels the previous build. */
export function syncSearchCatalog(
  pages: Record<string, Page>, notebooks: SearchNotebooks,
): Promise<SearchCatalog | null> {
  if (catalog.pagesRef === pages && catalog.notebooksRef === notebooks) return Promise.resolve(catalog);
  if (pending?.pages === pages && pending.notebooks === notebooks) return pending.promise;
  pending?.controller.abort();
  cancelIndexSync();
  const controller = new AbortController();
  const promise = buildCatalog(pages, notebooks, controller.signal).finally(() => {
    if (pending?.controller === controller) pending = null;
  });
  pending = { pages, notebooks, controller, promise };
  return promise;
}

export async function filterCatalogByScope(
  sortedByTitle: Page[],
  notebooks: SearchNotebooks,
  searchAllNotebooks: boolean,
  activeNotebookId: string | null,
  signal: AbortSignal,
): Promise<Page[] | null> {
  if (signal.aborted) return null;
  const scopeKey = JSON.stringify([searchAllNotebooks, activeNotebookId]);
  const cachedScopes = scopeCache.get(sortedByTitle);
  const cached = cachedScopes?.get(scopeKey);
  if (cached) return cached;
  const currentNotebookId = activeNotebookId || "__no-notebook__";
  const result: Page[] = [];
  const pause = createSearchTaskBudget(signal);
  for (const page of sortedByTitle) {
    if (signal.aborted) return null;
    if (shouldIncludePageInCommandScope(page, notebooks, searchAllNotebooks, currentNotebookId) &&
      (searchAllNotebooks || page.workspaceId === currentNotebookId)) result.push(page);
    const wait = pause();
    if (wait) await wait;
  }
  if (signal.aborted) return null;
  const scopes = cachedScopes ?? new Map<string, Page[]>();
  scopes.set(scopeKey, result);
  if (scopes.size > 4) scopes.delete(scopes.keys().next().value!);
  scopeCache.set(sortedByTitle, scopes);
  return result;
}
