import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { isPinyinQuery, pinyinMatchIndices } from "@/lib/pinyin-search";
import { titleMatchRank } from "./commandSearchRank";
import { prepareSearchQuery, scanLiteral, snippetAround } from "./commandSearchText";
import { getSearchBodyText } from "./searchBodyCache";
import { searchIndex } from "./pageSearchIndex";
import type { SearchCatalog } from "./pageSearchCatalog";
import { createSearchTaskBudget, yieldSearchTask } from "./searchTaskScheduling";
import type { SearchResultPage } from "./useCommandSearch";

export interface CommandMatches {
  all: SearchResultPage[];
  recentCandidates: SearchResultPage[];
}

/** Keep only one scan's data; no persistent query or body cache is introduced. */
export async function computeCommandMatches(
  pages: Page[],
  rawQuery: string,
  signal: AbortSignal,
  catalog: SearchCatalog,
): Promise<CommandMatches | null> {
  const query = rawQuery.trim();
  const prepared = prepareSearchQuery(query);
  if (!query || !prepared.text || signal.aborted) return null;
  await yieldSearchTask(signal);
  if (signal.aborted) return null;
  // 索引只决定次序。没建好或检索抛错时仍按正文做字面匹配，避免全局搜索空白。
  let indexOrder: string[] = [];
  try {
    indexOrder = searchIndex(query, catalog) ?? [];
  } catch (error) {
    console.error("Search index query failed", error);
  }
  const indexedIds = new Set<string>();
  const indexedResults = new Map<string, SearchResultPage>();
  const literalResults: SearchResultPage[] = [];
  const pinyinResults: SearchResultPage[] = [];
  const ranks = new Map<string, number>();
  const usePinyin = isPinyinQuery(rawQuery.trim());
  const pause = createSearchTaskBudget(signal);
  for (const id of indexOrder) {
    if (signal.aborted) return null;
    indexedIds.add(id);
    const wait = pause();
    if (wait) await wait;
  }

  for (const page of pages) {
    if (signal.aborted) return null;
    const title = getPageTitle(page);
    const body = getSearchBodyText(page);
    const titleHit = scanLiteral(title, prepared);
    const bodyHit = scanLiteral(body, prepared);
    const titleCount = titleHit.count;
    const bodyCount = bodyHit.count;
    const literal = titleCount > 0 || bodyCount > 0;
    const indexed = indexedIds.has(page.id);
    const pinyin = !literal && usePinyin &&
      pinyinMatchIndices(title, rawQuery.trim()) !== null;
    // Index tokens determine relevance, but cannot admit pages without a real match.
    if (literal || pinyin) {
      // Only matched pages need snippet extraction and decoration.
      const snippet = bodyHit.count > 0 ? snippetAround(body, bodyHit.start, bodyHit.end) : undefined;
      const titleSnippet = !snippet && titleHit.count > 0
        ? snippetAround(title, titleHit.start, titleHit.end) : undefined;
      const selectedSnippet = snippet ?? titleSnippet;
      const result: SearchResultPage = {
        ...page,
        contentSnippet: selectedSnippet?.snippet ?? body.slice(0, 100),
        snippetMatchIndex: selectedSnippet?.matchIndex,
        literalBodyMatchCount: bodyCount,
        titleMatchCount: titleCount,
        matchKind: bodyCount > 0 ? "literal" : titleCount > 0 ? "title" : "pinyin",
      };
      ranks.set(page.id, titleMatchRank(title, query));
      if (indexed) indexedResults.set(page.id, result);
      else if (literal) literalResults.push(result);
      else pinyinResults.push(result);
    }
    const wait = pause();
    if (wait) await wait;
  }
  if (signal.aborted) return null;

  // Preserve MiniSearch relevance, then catalog-order literal and pinyin fallbacks.
  // Four rank buckets avoid a synchronous O(n log n) sort of all matches.
  const matched: SearchResultPage[] = [];
  const buckets: SearchResultPage[][] = [[], [], [], []];
  const append = async (result: SearchResultPage) => {
    matched.push(result);
    buckets[ranks.get(result.id) ?? 3].push(result);
    const wait = pause();
    if (wait) await wait;
  };
  for (const id of indexOrder) {
    if (signal.aborted) return null;
    const result = indexedResults.get(id);
    if (result) await append(result);
  }
  for (const results of [literalResults, pinyinResults]) {
    for (const result of results) {
      if (signal.aborted) return null;
      await append(result);
    }
  }
  if (signal.aborted) return null;
  const all: SearchResultPage[] = [];
  for (const bucket of buckets) {
    for (const result of bucket) {
      if (signal.aborted) return null;
      all.push(result);
      const wait = pause();
      if (wait) await wait;
    }
  }
  return signal.aborted ? null : { all, recentCandidates: matched };
}
