import { tool } from "ai";
import { z } from "zod";
import { builtinRead, builtinSearch } from "./builtinWeb";
import {
  TINYFISH_SEARCH_URL,
  TINYFISH_FETCH_URL,
  errorMessage,
  readTinyfishKeyPool,
  tinyfishJson,
  tinyfishAuthHeaders,
  withTinyfishKeyRotation,
} from "./webTransport";
import {
  validateExternalHttpUrl,
  parseTinyfishSearchResults,
  parseTinyfishFetchResult,
} from "./webResults";
export {
  TINYFISH_KEY_MISSING_ERROR,
  TINYFISH_KEY_INVALID_ERROR,
  TINYFISH_RATE_LIMIT_ERROR,
  tinyfishKeyGuard,
} from "./webTransport";
export {
  validateExternalHttpUrl,
  parseTinyfishSearchResults,
  parseTinyfishFetchResult,
  type TinyfishSearchHit,
} from "./webResults";

async function tinyfishSearch(query: string, maxResults: number, signal?: AbortSignal) {
  if (readTinyfishKeyPool().length === 0) return null;
  const outcome = await withTinyfishKeyRotation((apiKey) =>
    tinyfishJson(
      `${TINYFISH_SEARCH_URL}?query=${encodeURIComponent(query)}`,
      { method: "GET", headers: tinyfishAuthHeaders(apiKey) },
      signal,
    ),
  );
  if (!outcome.ok) return null;
  try {
    const results = parseTinyfishSearchResults(outcome.data, maxResults);
    return results.length ? { source: "TinyFish", query, results, untrustedExternalContent: true } : null;
  } catch {
    return null;
  }
}

async function tinyfishRead(url: string, signal?: AbortSignal) {
  if (readTinyfishKeyPool().length === 0) return null;
  const outcome = await withTinyfishKeyRotation((apiKey) =>
    tinyfishJson(
      TINYFISH_FETCH_URL,
      {
        method: "POST",
        headers: { ...tinyfishAuthHeaders(apiKey), "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url], format: "markdown" }),
      },
      signal,
    ),
  );
  if (!outcome.ok) return null;
  const parsed = parseTinyfishFetchResult(outcome.data);
  if (parsed.error || !parsed.content) return null;
  return { source: "TinyFish", url, content: parsed.content, untrustedExternalContent: true };
}

export const searchWeb = tool({
  description:
    "联网搜索，返回标题、摘要和来源链接。需要最新或笔记以外的外部事实时调用。",
  inputSchema: z.object({
    query: z.string().min(1).describe("用自然语言描述希望找到的网页或信息"),
    maxResults: z.number().int().min(1).max(8).optional().default(5),
  }),
  execute: async (input, options) =>
    (await tinyfishSearch(input.query, input.maxResults, options.abortSignal)) ??
    builtinSearch(input.query, input.maxResults),
});

export const readWebPage = tool({
  description:
    "读取一个已知网页 URL 的正文并返回可供大模型使用的文本。看到用户给出的链接或搜索结果需要细读时调用，不能只根据 URL 猜测内容。",
  inputSchema: z.object({
    url: z.string().min(1).describe("要读取的完整 HTTP 或 HTTPS 网址"),
  }),
  execute: async (input, options) => {
    let url: string;
    try {
      url = validateExternalHttpUrl(input.url);
    } catch (error) {
      return { error: errorMessage(error) };
    }
    return (await tinyfishRead(url, options.abortSignal)) ?? builtinRead(url);
  },
});
