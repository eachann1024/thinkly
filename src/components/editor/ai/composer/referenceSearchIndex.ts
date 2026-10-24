import type { Page } from "@/types";
import type { Notebook } from "@/stores/useNotebooks";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getPinyinMatcherRevision, isPinyinQuery, pinyinMatchIndices } from "@/lib/pinyin-search";
import { getLocationSnapshot } from "./referenceMetadata";

export interface ReferenceSearchOptions {
  includeFolders?: boolean;
  notebookId?: string | null;
  priorityPageId?: string | null;
}

interface SearchRow {
  page: Page;
  workspaceId: string;
  notebookName: string;
  title: string;
  normalizedTitle: string;
  filename: string;
  location: string;
  hasCjk: boolean;
}
interface SearchIndex {
  rows: SearchRow[];
  queries: Map<string, Page[]>;
}
interface RankedRow { row: SearchRow; score: number }

const snapshots = new WeakMap<Record<string, Page>, WeakMap<Record<string, Notebook>, SearchIndex>>();
const rowCache = new WeakMap<Page, { notebook: Notebook | undefined; row: SearchRow }>();
const collator = new Intl.Collator("zh-CN", { numeric: true });
const TOKEN_SEPARATOR = /[\s/_.:-]/;
const MAX_RESULTS = 30;
const MAX_QUERIES = 64;

function getRow(page: Page, notebooks: Record<string, Notebook>): SearchRow {
  const workspaceId = page.workspaceId ?? (page as { notebookId?: string }).notebookId ?? "";
  const notebook = notebooks[workspaceId];
  const cached = rowCache.get(page);
  if (cached && cached.notebook === notebook) return cached.row;
  const title = getPageTitle(page);
  const filename = page.localFilePath?.split(/[\\/]/).pop()?.replace(/\.(md|markdown)$/i, "").trim() || title;
  const row = {
    page, workspaceId, notebookName: notebook?.name ?? "", title,
    normalizedTitle: title.trim().toLowerCase(),
    hasCjk: /[一-鿿]/.test(title),
    filename: filename.trim().toLowerCase(),
    location: getLocationSnapshot(page, notebooks).replace(/\.(md|markdown)$/i, "").trim().toLowerCase(),
  };
  rowCache.set(page, { notebook, row });
  return row;
}

function getIndex(pages: Record<string, Page>, notebooks: Record<string, Notebook>): SearchIndex {
  let byNotebook = snapshots.get(pages);
  if (!byNotebook) {
    byNotebook = new WeakMap();
    snapshots.set(pages, byNotebook);
  }
  let index = byNotebook.get(notebooks);
  if (!index) {
    const rows: SearchRow[] = [];
    for (const id in pages) {
      const page = pages[id];
      if (Object.hasOwn(pages, id) && !page.trashedAt) rows.push(getRow(page, notebooks));
    }
    index = { rows, queries: new Map() };
    byNotebook.set(notebooks, index);
  }
  return index;
}

function scoreField(field: string, query: string, base: number): number | null {
  if (!field) return null;
  if (field === query) return base;
  if (field.startsWith(query)) return base + 10;
  let at = field.indexOf(query);
  if (at === -1) return null;
  if (!TOKEN_SEPARATOR.test(query)) {
    while (at !== -1) {
      const end = at + query.length;
      if ((at === 0 || TOKEN_SEPARATOR.test(field[at - 1])) &&
        (end === field.length || TOKEN_SEPARATOR.test(field[end]))) return base + 20;
      at = field.indexOf(query, at + 1);
    }
  }
  return base + 30;
}

function scoreRow(row: SearchRow, query: string, rawQuery: string, pinyin: boolean): number | null {
  if (!query) return 0;
  const titleScore = scoreField(row.normalizedTitle, query, 0);
  const filenameScore = row.filename === row.normalizedTitle ? null : scoreField(row.filename, query, 1);
  let best = Math.min(titleScore ?? Infinity, filenameScore ?? Infinity);
  if (row.page.localFilePath && row.location && row.location !== row.normalizedTitle && row.location !== row.filename) {
    // Path scores cannot outrank title/filename matches.
    if (best === Infinity && row.location.includes(query)) {
      const segments = row.location.split("/");
      if (segments.includes(query)) best = 40;
      else if (segments.some((part) => part.startsWith(query))) best = 45;
      else best = 50;
    }
  }
  if (best === Infinity && pinyin && row.hasCjk && pinyinMatchIndices(row.title, rawQuery) !== null) best = 60;
  return best === Infinity ? null : best;
}

function compareRows(a: RankedRow, b: RankedRow, query: string, activeId: string | null, priorityId?: string | null): number {
  if (!query && priorityId && a.row.page.id !== b.row.page.id) {
    if (a.row.page.id === priorityId) return -1;
    if (b.row.page.id === priorityId) return 1;
  }
  if (query) {
    const scoreDelta = a.score - b.score;
    if (scoreDelta) return scoreDelta;
    const lengthDelta = a.row.title.length - b.row.title.length;
    if (lengthDelta) return lengthDelta;
  }
  const aActive = a.row.workspaceId === activeId;
  const bActive = b.row.workspaceId === activeId;
  if (aActive !== bActive) return aActive ? -1 : 1;
  return collator.compare(a.row.notebookName, b.row.notebookName) ||
    collator.compare(a.row.title, b.row.title) || a.row.page.id.localeCompare(b.row.page.id);
}

// Keep only the best 30 candidates; the root is the worst retained result.
function retainTop(heap: RankedRow[], value: RankedRow, compare: (a: RankedRow, b: RankedRow) => number) {
  if (heap.length < MAX_RESULTS) {
    let at = heap.push(value) - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (compare(heap[parent], value) >= 0) break;
      heap[at] = heap[parent];
      at = parent;
    }
    heap[at] = value;
    return;
  }
  if (compare(value, heap[0]) >= 0) return;
  let at = 0;
  while (at * 2 + 1 < heap.length) {
    let child = at * 2 + 1;
    if (child + 1 < heap.length && compare(heap[child + 1], heap[child]) > 0) child++;
    if (compare(value, heap[child]) >= 0) break;
    heap[at] = heap[child];
    at = child;
  }
  heap[at] = value;
}

export function findReferencePages(
  query: string,
  pages: Record<string, Page>,
  notebooks: Record<string, Notebook>,
  activeNotebookId: string | null,
  options?: ReferenceSearchOptions,
): Page[] {
  const index = getIndex(pages, notebooks);
  const rawQuery = query.trim();
  const normalized = rawQuery.toLowerCase();
  const key = JSON.stringify([normalized, rawQuery, activeNotebookId, Boolean(options?.includeFolders),
    options?.notebookId ?? null, options?.priorityPageId ?? null, getPinyinMatcherRevision()]);
  const cached = index.queries.get(key);
  if (cached) {
    index.queries.delete(key);
    index.queries.set(key, cached);
    return cached;
  }
  const heap: RankedRow[] = [];
  const compare = (a: RankedRow, b: RankedRow) => compareRows(a, b, normalized, activeNotebookId, options?.priorityPageId);
  const pinyin = isPinyinQuery(rawQuery);
  for (const row of index.rows) {
    if ((!options?.includeFolders && row.page.isFolder) ||
      (options?.notebookId && row.workspaceId !== options.notebookId)) continue;
    const score = scoreRow(row, normalized, rawQuery, pinyin);
    if (score != null) retainTop(heap, { row, score }, compare);
  }
  const result = heap.sort(compare).map(({ row }) => row.page);
  index.queries.set(key, result);
  if (index.queries.size > MAX_QUERIES) index.queries.delete(index.queries.keys().next().value!);
  return result;
}
