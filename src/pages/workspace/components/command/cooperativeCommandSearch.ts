import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { isPinyinQuery, pinyinMatchIndices } from "@/lib/pinyin-search";
import { titleMatchRank } from "./commandSearchRank";
import { getContentSnippet } from "./commandSearchText";
import { getSearchBodyText } from "./searchBodyCache";
import { searchIndex } from "./pageSearchIndex";
import type { SearchResultPage } from "./useCommandSearch";

export interface CommandMatches {
  all: SearchResultPage[];
  recentCandidates: SearchResultPage[];
}

function countLoweredMatches(text: string, needle: string): number {
  let count = 0;
  let position = 0;
  while ((position = text.indexOf(needle, position)) !== -1) {
    count++;
    position += needle.length;
  }
  return count;
}

/** Yield between pages; abortable waits also release cancelled scans promptly. */
function yieldToInput(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 0);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) finish();
  });
}

/** Keep only one scan's data; no persistent query or body cache is introduced. */
export async function computeCommandMatches(
  pages: Page[],
  rawQuery: string,
  signal: AbortSignal,
): Promise<CommandMatches | null> {
  const query = rawQuery.trim().toLowerCase();
  const needle = query.toLocaleLowerCase();
  if (!needle || signal.aborted) return null;
  const indexOrder = searchIndex(rawQuery.trim());
  const indexedIds = new Set(indexOrder);
  const indexedResults = new Map<string, SearchResultPage>();
  const literalResults: SearchResultPage[] = [];
  const pinyinResults: SearchResultPage[] = [];
  const ranks = new Map<string, number>();
  const usePinyin = isPinyinQuery(rawQuery.trim());
  let batchStarted = performance.now();

  for (const page of pages) {
    if (signal.aborted) return null;
    const title = getPageTitle(page);
    const body = getSearchBodyText(page);
    const titleCount = countLoweredMatches(title.toLocaleLowerCase(), needle);
    const bodyCount = countLoweredMatches(body.toLocaleLowerCase(), needle);
    const literal = titleCount > 0 || bodyCount > 0;
    const indexed = indexedIds.has(page.id);
    const pinyin = !literal && usePinyin &&
      pinyinMatchIndices(title, rawQuery.trim()) !== null;
    // Index tokens determine relevance, but cannot admit pages without a real match.
    if (literal || pinyin) {
      // Only matched pages need snippet extraction and decoration.
      const snippet = bodyCount > 0 ? getContentSnippet(body, query) : undefined;
      const titleSnippet = !snippet && titleCount > 0
        ? getContentSnippet(title, query) : undefined;
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
    if (performance.now() - batchStarted >= 6) {
      await yieldToInput(signal);
      batchStarted = performance.now();
    }
  }
  if (signal.aborted) return null;

  // Preserve MiniSearch relevance, then catalog-order literal and pinyin fallbacks.
  // Four rank buckets avoid a synchronous O(n log n) sort of all matches.
  const matched: SearchResultPage[] = [];
  const buckets: SearchResultPage[][] = [[], [], [], []];
  const append = async (result: SearchResultPage) => {
    matched.push(result);
    buckets[ranks.get(result.id) ?? 3].push(result);
    if (performance.now() - batchStarted >= 6) {
      await yieldToInput(signal);
      batchStarted = performance.now();
    }
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
  return { all: buckets.flat(), recentCandidates: matched };
}
