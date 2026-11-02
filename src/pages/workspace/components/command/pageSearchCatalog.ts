import type { Page } from "@/types";
import { clearContentDerivationsCache } from "@/components/editor/utils/content-page-derivations-cache";
import { changedPageIds } from "@/stores/pages/pageChanges";
import { clearSearchBodyCache, pruneSearchBodyCache } from "./searchBodyCache";
import { cancelIndexSync, resetIndex } from "./pageSearchIndex";
import { createSearchTaskBudget, sortSearchCatalog, yieldSearchTask } from "./searchTaskScheduling";
import { createCatalogOrdering, insertCatalogPage, searchMetadataSignature, searchNotebookSignature } from "./searchCatalogMetadata";
import { isCommandSearchablePage, shouldIncludePageInCommandScope, type SearchNotebook } from "./searchPageFilter";

export type SearchNotebooks = Record<string, SearchNotebook | undefined>;
export interface SearchCatalog {
  pagesRef: Record<string, Page> | null;
  notebooksRef: SearchNotebooks | null;
  sortedByTitle: Page[];
  pageIdsWithChildren: Set<string>;
  searchableIds: Set<string>;
  revision: number;
  bodyRevision: number;
  notebookKey: string;
}
const scopeCache = new WeakMap<Page[], Map<string, Page[]>>();
let ordering = createCatalogOrdering();
let childCounts = new Map<string, number>();
let pending: {
  pages: Record<string, Page>; notebooks: SearchNotebooks;
  controller: AbortController; promise: Promise<SearchCatalog | null>;
} | null = null;
function emptyCatalog(): SearchCatalog {
  return { pagesRef: null, notebooksRef: null, sortedByTitle: [],
    pageIdsWithChildren: new Set(), searchableIds: new Set(), revision: 0,
    bodyRevision: 0, notebookKey: "" };
}
let catalog = emptyCatalog();
export function getSearchCatalog(): SearchCatalog { return catalog; }
export function cancelSearchCatalogSync(): void {
  pending?.controller.abort();
  pending = null;
  cancelIndexSync();
}
export function resetSearchCatalog(): void {
  cancelSearchCatalogSync();
  ordering = createCatalogOrdering();
  childCounts = new Map();
  clearSearchBodyCache();
  clearContentDerivationsCache();
  resetIndex();
  catalog = emptyCatalog();
}

async function buildCatalog(
  pages: Record<string, Page>, notebooks: SearchNotebooks, signal: AbortSignal,
): Promise<SearchCatalog | null> {
  await yieldSearchTask(signal, true);
  if (signal.aborted) return null;
  const previous = catalog;
  const notebookKey = searchNotebookSignature(notebooks);
  const notebooksChanged = notebookKey !== previous.notebookKey;
  const ids = changedPageIds(previous.pagesRef, pages);
  const metadataIds = new Set<string>();
  let bodyChanged = false;
  const pause = createSearchTaskBudget(signal, true);
  for (const id of ids) {
    if (signal.aborted) return null;
    const before = previous.pagesRef?.[id], after = pages[id];
    const metaChanged = !before || !after || searchMetadataSignature(before) !== searchMetadataSignature(after);
    if (metaChanged) metadataIds.add(id);
    const changedBody = !before || !after || before.content !== after.content || before.updatedAt !== after.updatedAt;
    bodyChanged ||= changedBody;
    const wait = pause(); if (wait) await wait;
  }
  const metadataChanged = notebooksChanged || metadataIds.size > 0;
  let sortedByTitle = previous.sortedByTitle;
  let searchableIds = previous.searchableIds;
  let pageIdsWithChildren = previous.pageIdsWithChildren;
  let nextCounts = childCounts;
  let nextOrdering = ordering;
  if (metadataChanged) {
    nextOrdering = ordering.clone();
    nextCounts = new Map(childCounts);
    for (const id of ids) {
      if (pages[id]) nextOrdering.add(id);
      else nextOrdering.remove(id);
    }
    const countChild = (page: Page | undefined, delta: number) => {
      if (!page || page.trashedAt || !page.parentId) return;
      const count = (nextCounts.get(page.parentId) ?? 0) + delta;
      if (count > 0) nextCounts.set(page.parentId, count);
      else nextCounts.delete(page.parentId);
    };
    for (const id of metadataIds) {
      countChild(previous.pagesRef?.[id], -1);
      countChild(pages[id], 1);
    }
    pageIdsWithChildren = new Set(nextCounts.keys());
    if (notebooksChanged || metadataIds.size > 64) {
      const candidates: Page[] = [];
      for (const id in pages) {
        if (signal.aborted) return null;
        nextOrdering.add(id);
        if (isCommandSearchablePage(pages[id], notebooks)) candidates.push(pages[id]);
        const wait = pause(); if (wait) await wait;
      }
      const sorted = await sortSearchCatalog(candidates, nextOrdering.compare, signal);
      if (!sorted) return null;
      sortedByTitle = sorted;
      searchableIds = new Set(sorted.map(page => page.id));
    } else {
      sortedByTitle = previous.sortedByTitle.filter(page => !metadataIds.has(page.id));
      searchableIds = new Set(previous.searchableIds);
      for (const id of metadataIds) {
        searchableIds.delete(id);
        const page = pages[id];
        if (page && isCommandSearchablePage(page, notebooks)) {
          insertCatalogPage(sortedByTitle, page, nextOrdering.compare);
          searchableIds.add(id);
        }
      }
    }
    if (ids.some(id => !pages[id])) pruneSearchBodyCache({ has: id => !!pages[id] });
  }
  if (signal.aborted) return null;
  ordering = nextOrdering;
  childCounts = nextCounts;
  catalog = { pagesRef: pages, notebooksRef: notebooks, sortedByTitle, pageIdsWithChildren,
    searchableIds, notebookKey,
    revision: previous.revision + Number(metadataChanged),
    bodyRevision: previous.bodyRevision + Number(bodyChanged) };
  return catalog;
}

export function syncSearchCatalog(pages: Record<string, Page>, notebooks: SearchNotebooks): Promise<SearchCatalog | null> {
  if (catalog.pagesRef === pages && catalog.notebooksRef === notebooks) return Promise.resolve(catalog);
  if (pending?.pages === pages && pending.notebooks === notebooks) return pending.promise;
  cancelSearchCatalogSync();
  const controller = new AbortController();
  const promise = buildCatalog(pages, notebooks, controller.signal).finally(() => {
    if (pending?.controller === controller) pending = null;
  });
  pending = { pages, notebooks, controller, promise };
  return promise;
}

export async function filterCatalogByScope(
  sortedByTitle: Page[], notebooks: SearchNotebooks, searchAllNotebooks: boolean,
  activeNotebookId: string | null, signal: AbortSignal,
): Promise<Page[] | null> {
  if (signal.aborted) return null;
  const scopeKey = JSON.stringify([searchAllNotebooks, activeNotebookId, searchNotebookSignature(notebooks)]);
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
    const wait = pause(); if (wait) await wait;
  }
  if (signal.aborted) return null;
  const scopes = cachedScopes ?? new Map<string, Page[]>();
  scopes.set(scopeKey, result);
  if (scopes.size > 4) scopes.delete(scopes.keys().next().value!);
  scopeCache.set(sortedByTitle, scopes);
  return result;
}
