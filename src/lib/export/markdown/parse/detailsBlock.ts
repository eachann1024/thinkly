import { parseInlineMarkdown } from "./inline";

function decodeSummary(text: string): string {
  return text.replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

/** 配对外层 details；代码围栏内的 HTML 文本不参与嵌套深度计算。 */
export function parseDetailsBlock(
  lines: string[], start: number, parseMarkdown: (markdown: string) => any[],
) {
  const opening = lines[start].match(/^\s*<details\b([^>]*)>/i);
  if (!opening) return null;
  let depth = 1;
  let fence: { char: string; length: number } | null = null;
  const body: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = index === start ? lines[index].slice(opening[0].length) : lines[index];
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (new RegExp(`^\\s*${fence.char}{${fence.length},}\\s*$`).test(line)) fence = null;
      body.push(line);
      continue;
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length };
      body.push(line);
      continue;
    }
    const tags = line.matchAll(/<\/?details\b[^>]*>/gi);
    for (const tag of tags) {
      depth += /^<\//.test(tag[0]) ? -1 : 1;
      if (depth !== 0) continue;
      // 除了外层结束标签，不消费同一行后续内容，交还主解析器处理。
      if (line.slice((tag.index ?? 0) + tag[0].length).trim()) return null;
      body.push(line.slice(0, tag.index));
      const inner = body.join("\n");
      const summary = inner.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      if (!summary) return null;
      const heading = summary[1].trim().match(/^<h([1-3])\b[^>]*>([\s\S]*)<\/h\1>$/i);
      const children = parseMarkdown(inner.slice(summary[0].length));
      return {
        block: {
          type: heading ? "heading" : "toggleListItem",
          props: {
            collapsed: !/(?:^|\s)open(?:\s|=|$)/i.test(opening[1]),
            ...(heading ? { level: Number(heading[1]), isToggleable: true } : {}),
          },
          content: parseInlineMarkdown(decodeSummary(heading ? heading[2] : summary[1])),
          ...(children.length ? { children } : {}),
        },
        nextIndex: index + 1,
      };
    }
    body.push(line);
  }
  // 不完整 HTML 保留为原文，不能解析成缺少后半子树的有效折叠块。
  return null;
}
