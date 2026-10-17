import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/command/pageSearchIndex.ts#localMessages:1">`
zh-Hans:
  untitled: "无标题"
en:
  untitled: "Untitled"
`;
const uiText = createTranslator(localMessages);
/**
 * Shared incremental MiniSearch index. Every complete index is tied to one
 * immutable catalog; partially maintained versions are never queried.
 */
import MiniSearch from "minisearch";
import type { Page } from "@/types";
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

/** CJK characters remain individual tokens; other runs preserve existing matching. */
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
  const pageIds = new Set<string>();
  const pause = createSearchTaskBudget(signal, true);
  for (const page of catalog.sortedByTitle) {
    if (signal.aborted) return false;
    pageIds.add(page.id);
    const wait = pause();
    if (wait) await wait;
  }
  for (const id of indexedVersions.keys()) {
    if (signal.aborted) return false;
    if (!pageIds.has(id)) {
      if (ms.has(id)) ms.discard(id);
      indexedVersions.delete(id);
    }
    const wait = pause();
    if (wait) await wait;
  }
  for (const page of catalog.sortedByTitle) {
    if (signal.aborted) return false;
    const current = indexedVersions.get(page.id);
    const title = getPageTitle(page);
    if (!current || current.updatedAt !== page.updatedAt ||
      current.content !== page.content || current.title !== title) {
      const doc: IndexDoc = {
        id: page.id, title: isPlaceholderTitle(title) ? "" : title,
        body: bodyForSearchIndex(page, title),
      };
      // Publish the version only after MiniSearch accepted the complete page.
      if (ms.has(page.id)) ms.replace(doc);
      else ms.add(doc);
      indexedVersions.set(page.id, { updatedAt: page.updatedAt, content: page.content, title });
    }
    const wait = pause();
    if (wait) await wait;
  }
  if (signal.aborted) return false;
  indexedCatalog = catalog;
  return true;
}

export function cancelIndexSync(): void {
  pending?.controller.abort();
  pending = null;
  indexedCatalog = null;
}

/** Cancel superseded work, but retain successfully indexed pages for the next pass. */
export function syncIndex(catalog: SearchCatalog): Promise<boolean> {
  if (indexedCatalog === catalog) return Promise.resolve(true);
  if (pending?.catalog === catalog) return pending.promise;
  cancelIndexSync();
  const controller = new AbortController();
  const promise = maintainIndex(catalog, controller.signal).finally(() => {
    if (pending?.controller === controller) pending = null;
  });
  pending = { catalog, controller, promise };
  return promise;
}

/** A caller cannot accidentally search a partially updated or older index. */
export function searchIndex(query: string, catalog: SearchCatalog): string[] | null {
  if (!miniSearch || indexedCatalog !== catalog) return null;
  return miniSearch.search(query).map(result => result.id as string);
}

export function resetIndex(): void {
  cancelIndexSync();
  miniSearch = null;
  indexedVersions.clear();
}
