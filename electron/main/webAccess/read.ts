import { fetchText } from "./http";
import { extractTitle, htmlToReadableText } from "./html";

const MAX_CONTENT = 48_000;

export async function builtinReadPage(url: string): Promise<{ url: string; title: string; content: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("只允许读取 HTTP 或 HTTPS 网页");
  const { status, text, finalUrl, contentType } = await fetchText(parsed.toString());
  if (status >= 400) throw new Error(`网页打不开（HTTP ${status}）`);
  const isHtml = /html|xml/i.test(contentType) || /^\s*</.test(text);
  const content = isHtml ? htmlToReadableText(text) : text.trim();
  if (!content) throw new Error("网页没有可读取的正文");
  return {
    url: finalUrl,
    title: isHtml ? extractTitle(text) : "",
    content: content.length > MAX_CONTENT ? `${content.slice(0, MAX_CONTENT)}\n\n[内容过长，已截断]` : content,
  };
}
