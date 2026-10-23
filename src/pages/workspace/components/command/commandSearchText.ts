const WS = "[\\t\\n\\r \\u00a0\\u3000\\u200b\\ufeff]";
const REGEXP_META = /[\\^$.*+?()[\]{}|]/;

export type PreparedSearch = { text: string; source: RegExp | null };
export type LiteralHit = { count: number; start: number; end: number };

const MISS: LiteralHit = { count: 0, start: -1, end: -1 };

function isWs(code: number): boolean {
  return code === 9 || code === 10 || code === 13 || code === 32 || code === 0xa0 || code === 0x3000 || code === 0x200b || code === 0xfeff;
}

/** 汉字、扩展汉字、兼容汉字、平假名与片假名。这些字符之间的空白不参与匹配。 */
function isCjk(code: number): boolean {
  return (code >= 0x4e00 && code <= 0x9fff)
    || (code >= 0x3400 && code <= 0x4dbf)
    || (code >= 0xf900 && code <= 0xfaff)
    || (code >= 0x3040 && code <= 0x30ff);
}

function escapeChar(code: number): string {
  const ch = String.fromCharCode(code);
  return REGEXP_META.test(ch) ? `\\${ch}` : ch;
}

/**
 * 把查询收成一条可复用的匹配。
 * 汉字之间的换行和空格可有可无；英文空白折成一段空白，避免 hello world 命中 helloworld。
 * 整次搜索只编译一次，逐页扫描不再分配等长副本。
 */
export function prepareSearchQuery(query: string): PreparedSearch {
  const raw = query.trim();
  let text = "";
  let pattern = "";
  let letters = false;
  let prevCjk = false;
  let pendingSpace = false;
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (isWs(code)) {
      pendingSpace = text.length > 0;
      continue;
    }
    const folded = code >= 65 && code <= 90 ? code + 32 : code;
    if (folded >= 97 && folded <= 122) letters = true;
    const cjk = isCjk(folded);
    if (text.length > 0 && (pendingSpace || (prevCjk && cjk))) {
      const betweenCjk = prevCjk && cjk;
      if (pendingSpace && !betweenCjk) text += " ";
      pattern += pendingSpace && !betweenCjk ? `${WS}+` : `${WS}*`;
    }
    text += String.fromCharCode(folded);
    pattern += escapeChar(folded);
    prevCjk = cjk;
    pendingSpace = false;
  }
  if (!text) return { text: "", source: null };
  return { text, source: new RegExp(pattern, letters ? "gi" : "g") };
}

/** 一次扫完命中次数和第一处原文范围，供计数与摘要共用。 */
export function scanLiteral(content: string, prepared: PreparedSearch): LiteralHit {
  const source = prepared.source;
  if (!source || !content) return MISS;
  source.lastIndex = 0;
  let count = 0;
  let start = -1;
  let end = -1;
  let match: RegExpExecArray | null;
  while ((match = source.exec(content))) {
    if (!match[0]) {
      source.lastIndex += 1;
      continue;
    }
    if (start < 0) {
      start = match.index;
      end = match.index + match[0].length;
    }
    count += 1;
  }
  source.lastIndex = 0;
  return count ? { count, start, end } : MISS;
}

export function looseMatchRanges(
  content: string,
  query: string,
): Array<{ start: number; end: number }> {
  const prepared = prepareSearchQuery(query);
  const source = prepared.source;
  if (!source || !content) return [];
  source.lastIndex = 0;
  const ranges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = source.exec(content))) {
    if (!match[0]) {
      source.lastIndex += 1;
      continue;
    }
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  source.lastIndex = 0;
  return ranges;
}

export function snippetAround(
  contentText: string,
  start: number,
  end: number,
  contextLength = 30,
): { snippet: string; matchIndex: number } {
  const contextStart = Math.max(0, start - contextLength);
  const contextEnd = Math.min(contentText.length, end + contextLength);
  return {
    snippet: `${contextStart > 0 ? "..." : ""}${contentText.slice(contextStart, contextEnd)}${contextEnd < contentText.length ? "..." : ""}`,
    matchIndex: start - contextStart + (contextStart > 0 ? 3 : 0),
  };
}

export function getContentSnippet(
  contentText: string,
  query: string,
  contextLength = 30,
): { snippet: string; matchIndex: number } | undefined {
  const hit = scanLiteral(contentText, prepareSearchQuery(query));
  if (!hit.count) return undefined;
  return snippetAround(contentText, hit.start, hit.end, contextLength);
}

export function countLiteralMatches(content: string, query: string): number {
  return scanLiteral(content, prepareSearchQuery(query)).count;
}
