import { fetchText } from "./http";
import { decodeEntities, stripTags } from "./html";

export type WebSearchHit = { title: string; url: string; snippet: string };

/** Bing 结果链接可能被包成 bing.com/ck/a?...&u=a1<base64url>，这里还原真实地址。 */
function unwrapBingUrl(href: string) {
  try {
    const url = new URL(decodeEntities(href));
    if (!/bing\.com$/i.test(url.hostname) || !url.pathname.startsWith("/ck/")) return url.toString();
    const encoded = url.searchParams.get("u");
    if (!encoded?.startsWith("a1")) return null;
    const base64 = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64 + "=".repeat((4 - (base64.length % 4)) % 4), "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function parseBingResults(html: string, limit: number): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  const blocks = html.split(/<li[^>]+class="[^"]*\bb_algo\b[^"]*"/i).slice(1);
  for (const block of blocks) {
    const link = /<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!link) continue;
    const url = unwrapBingUrl(link[1]);
    const title = stripTags(link[2]);
    if (!url || !/^https?:/i.test(url) || !title) continue;
    const snippetHtml =
      /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1] ??
      /<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1] ??
      "";
    hits.push({ title, url, snippet: stripTags(snippetHtml).replace(/^\d{4}年\d{1,2}月\d{1,2}日\s*·\s*/, "") });
    if (hits.length >= limit) break;
  }
  return hits;
}

export function parseDuckDuckGoResults(html: string, limit: number): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  const blocks = html.split(/<div[^>]+class="[^"]*\bresult\b[^"]*"/i).slice(1);
  for (const block of blocks) {
    const link = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!link) continue;
    let url = decodeEntities(link[1]);
    const uddg = /[?&]uddg=([^&]+)/.exec(url)?.[1];
    if (uddg) url = decodeURIComponent(uddg);
    if (url.startsWith("//")) url = `https:${url}`;
    const title = stripTags(link[2]);
    if (!/^https?:/i.test(url) || !title || /duckduckgo\.com\/y\.js/.test(url)) continue;
    const snippet = stripTags(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(block)?.[1] ?? "");
    hits.push({ title, url, snippet });
    if (hits.length >= limit) break;
  }
  return hits;
}

const ENGINES = [
  { name: "Bing", url: (q: string) => `https://cn.bing.com/search?q=${encodeURIComponent(q)}&ensearch=0`, parse: parseBingResults },
  { name: "Bing", url: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`, parse: parseBingResults },
  { name: "DuckDuckGo", url: (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, parse: parseDuckDuckGoResults },
];

/** 自带联网搜索：无需密钥，依次尝试 Bing 中国、Bing 国际、DuckDuckGo，拿到结果即返回。 */
export async function builtinWebSearch(query: string, limit = 6): Promise<{ engine: string; results: WebSearchHit[] }> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("搜索词为空");
  let lastError: unknown = null;
  for (const engine of ENGINES) {
    try {
      const { status, text } = await fetchText(engine.url(trimmed));
      if (status >= 400) throw new Error(`HTTP ${status}`);
      const results = engine.parse(text, limit);
      if (results.length) return { engine: engine.name, results };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw new Error("联网搜索暂时不可用，请检查网络后重试");
  return { engine: "Bing", results: [] };
}
