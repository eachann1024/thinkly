import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/command/pageSearchIndex.ts#localMessages:1">`
zh-Hans:
  untitled: "无标题"
en:
  untitled: "Untitled"
ja:
  untitled: "無題"
`;
const uiText = createTranslator(localMessages);
import MiniSearch from "minisearch";
import type { Page } from "@/types";
import { changedPageIds } from "@/stores/pages/pageChanges";
import { getPageTitle, UNTITLED_PAGE_TITLE } from "@/components/editor/utils/page-title";
import { getContentDerivationsForPage } from "@/components/editor/utils/content-page-derivations-cache";
import type { SearchCatalog } from "./pageSearchCatalog";
import { createSearchTaskBudget, yieldSearchTask } from "./searchTaskScheduling";

function isPlaceholderTitle(title: string): boolean {
  return title === UNTITLED_PAGE_TITLE || title === uiText("untitled");
}

function bodyForSearchIndex(page: Page, title: string): string {
  const body = getContentDerivationsForPage(page).text;
  if (!isPlaceholderTitle(title)) return body;
  return body.replace(/^(?:新页面|未命名|无标题)\s*/, "").trim();
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /[一-鿿㐀-䶿豈-﫿぀-ヿ]|[^\s一-鿿㐀-䶿豈-﫿぀-ヿ]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const token = match[0].trim();
    if (token) tokens.push(token);
  }
  return tokens;
}

interface IndexDoc { id: string; title: string; body: string }
let miniSearch: MiniSearch<IndexDoc> | null = null;
let indexedCatalog: SearchCatalog | null = null;
const dirtyIds = new Set<string>();
const indexedVersions = new Map<
  string, { updatedAt: number; content: Page["content"]; title: string }
>();
let pending: {
  catalog: SearchCatalog;
  controller: AbortController;
  promise: Promise<boolean>;
} | null = null;

function getInstance(): MiniSearch<IndexDoc> {
  if (!miniSearch) {
    miniSearch = new MiniSearch<IndexDoc>({
      fields: ["title", "body"],
      storeFields: ["id"],
      tokenize,
      autoVacuum: { batchSize: 64, batchWait: 8 },
      searchOptions: {
        tokenize, prefix: true, boost: { title: 2 }, fuzzy: 0.1, combineWith: "AND",
      },
    });
  }
  return miniSearch;
}

async function maintainIndex(catalog: SearchCatalog, signal: AbortSignal): Promise<boolean> {
  await yieldSearchTask(signal, true);
  if (signal.aborted) return false;
  const ms = getInstance();
  const changed = !indexedCatalog || indexedCatalog.notebookKey !== catalog.notebookKey
    ? new Set([...indexedVersions.keys(), ...catalog.searchableIds])
    : changedPageIds(indexedCatalog.pagesRef, catalog.pagesRef!);
  for (const id of changed) dirtyIds.add(id);
  const pause = createSearchTaskBudget(signal, true);
  for (const id of dirtyIds) {
    if (signal.aborted) return false;
    const page = catalog.searchableIds.has(id) ? catalog.pagesRef?.[id] : undefined;
    if (!page) {
      if (ms.has(id)) ms.discard(id);
      indexedVersions.delete(id);
    } else {
      const current = indexedVersions.get(id);
      const title = getPageTitle(page);
      if (!current || current.content !== page.content || current.title !== title) {
        const doc: IndexDoc = {
          id, title: isPlaceholderTitle(title) ? "" : title,
          body: bodyForSearchIndex(page, title),
        };
        if (ms.has(id)) ms.replace(doc);
        else ms.add(doc);
        indexedVersions.set(id, { updatedAt: page.updatedAt, content: page.content, title });
      }
    }
    const wait = pause();
    if (wait) await wait;
  }
  if (signal.aborted) return false;
  dirtyIds.clear();
  indexedCatalog = catalog;
  return true;
}

export function cancelIndexSync(): void {
  pending?.controller.abort();
  pending = null;
}

export function syncIndex(catalog: SearchCatalog): Promise<boolean> {
  if (indexedCatalog === catalog && dirtyIds.size === 0 && !pending) return Promise.resolve(true);
  if (pending?.catalog === catalog) return pending.promise;
  cancelIndexSync();
  const controller = new AbortController();
  const promise = maintainIndex(catalog, controller.signal).finally(() => {
    if (pending?.controller === controller) pending = null;
  });
  pending = { catalog, controller, promise };
  return promise;
}

export function searchIndex(query: string, catalog: SearchCatalog): string[] | null {
  if (!miniSearch || indexedCatalog !== catalog || dirtyIds.size > 0 || pending) return null;
  return miniSearch.search(query).map(result => result.id as string);
}

export function resetIndex(): void {
  cancelIndexSync();
  miniSearch = null;
  indexedVersions.clear();
  indexedCatalog = null;
  dirtyIds.clear();
}
