type PinyinMatch = typeof import("pinyin-pro").match;

let pinyinMatch: PinyinMatch | null = null;
let preloading = false;
let matcherRevision = 0;

export function getPinyinMatcherRevision(): number {
  return matcherRevision;
}

export function warmPinyinMatcher(): void {
  if (pinyinMatch || preloading) return;
  preloading = true;
  void import("pinyin-pro")
    .then((mod) => {
      pinyinMatch = mod.match;
      matchCache.clear();
      matcherRevision++;
    })
    .catch(() => {
      preloading = false;
    });
}

const matchCache = new Map<string, readonly number[] | null>();
const MAX_MATCHES = 1024;

const PINYIN_QUERY_RE = /^[a-zA-Z]+$/;
const HAS_CJK_RE = /[一-鿿]/;

export function isPinyinQuery(query: string): boolean {
  return PINYIN_QUERY_RE.test(query);
}

export function pinyinMatchIndices(text: string, query: string): number[] | null {
  if (!query || !text) return null;
  if (!isPinyinQuery(query) || !HAS_CJK_RE.test(text)) return null;
  // A not-yet-loaded matcher is not a negative match: never cache that state.
  if (!pinyinMatch) return null;
  const key = JSON.stringify([text, query]);
  if (matchCache.has(key)) {
    const cached = matchCache.get(key)!;
    matchCache.delete(key);
    matchCache.set(key, cached);
    return cached ? [...cached] : null;
  }
  const result = pinyinMatch(text, query, { continuous: true, precision: "start" });
  matchCache.set(key, result ? [...result] : null);
  if (matchCache.size > MAX_MATCHES) matchCache.delete(matchCache.keys().next().value!);
  return result;
}
