/** 轻量 HTML 处理：不引第三方解析库，够搜索结果抽取和正文提取用。 */

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ensp: " ", emsp: " ",
  mdash: "—", ndash: "–", hellip: "…", middot: "·", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function stripTags(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function dropBlocks(html: string, tags: string[]) {
  let out = html;
  for (const tag of tags) out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi"), " ");
  return out;
}

export function extractTitle(html: string) {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i.exec(html)?.[1];
  const title = og ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  return stripTags(title);
}

/** 正文提取：优先 article/main，去掉导航、脚本等噪声，块级标签换行，输出近似 Markdown 的纯文本。 */
export function htmlToReadableText(html: string) {
  let body = html.replace(/<!--[\s\S]*?-->/g, " ");
  body = dropBlocks(body, ["script", "style", "noscript", "svg", "template", "iframe", "nav", "footer", "header", "aside", "form", "button", "select"]);
  const main = /<article\b[\s\S]*?<\/article>/i.exec(body)?.[0] ?? /<main\b[\s\S]*?<\/main>/i.exec(body)?.[0];
  if (main && stripTags(main).length > 300) body = main;
  body = body
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, inner: string) => `\n\n${"#".repeat(Number(level))} ${stripTags(inner)}\n\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|tr|table|ul|ol|blockquote|pre|li|dd|dt)>/gi, "\n");
  const text = decodeEntities(body.replace(/<[^>]*>/g, " "));
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line, index, lines) => line || (lines[index - 1] ?? "") !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
