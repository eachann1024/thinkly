type PinyinMatch = typeof import("pinyin-pro").match;

// pinyin-pro 约 290KB，只在命令搜索里为中文标题做拼音匹配。首帧不需要它，
// 因此改成按需加载：首帧之后在空闲时预热，未就绪时退回子串匹配。
let pinyinMatch: PinyinMatch | null = null;
let preloading = false;

/** 空闲时预热拼音匹配器（首帧之后调用，不阻塞启动）。 */
export function warmPinyinMatcher(): void {
  if (pinyinMatch || preloading) return;
  preloading = true;
  void import("pinyin-pro")
    .then((mod) => {
      pinyinMatch = mod.match;
    })
    .catch(() => {
      preloading = false;
    });
}

const matchCache = new Map<string, readonly number[] | null>();
const MAX_MATCHES = 1024;

const PINYIN_QUERY_RE = /^[a-zA-Z]+$/;
const HAS_CJK_RE = /[一-鿿]/;

/** query 是否可能是拼音输入（纯英文字母） */
export function isPinyinQuery(query: string): boolean {
  return PINYIN_QUERY_RE.test(query);
}

/**
 * 拼音模糊匹配：返回 text 中被命中的字符下标数组，未命中返回 null。
 * 仅当 query 为纯字母且 text 含汉字时尝试，避免对英文标题误判。
 * continuous: true 要求命中字符连续，结果更符合搜索直觉。
 */
export function pinyinMatchIndices(text: string, query: string): number[] | null {
  if (!query || !text) return null;
  if (!isPinyinQuery(query) || !HAS_CJK_RE.test(text)) return null;
  const key = JSON.stringify([text, query]);
  if (matchCache.has(key)) {
    const cached = matchCache.get(key)!;
    matchCache.delete(key);
    matchCache.set(key, cached);
    return cached ? [...cached] : null;
  }
  const result = pinyinMatch?.(text, query, { continuous: true, precision: "start" }) ?? null;
  matchCache.set(key, result ? [...result] : null);
  if (matchCache.size > MAX_MATCHES) matchCache.delete(matchCache.keys().next().value!);
  return result;
}
