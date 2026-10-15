import { serializeFencedCode } from "./export/markdown/serialize/codeFence";

const RAW_BLOCK_LANGUAGE = "goose-raw-block";
const RAW_BLOCK_MARKER = "<!-- goose-note:raw-block -->";

const INLINE_HTML_ALLOWLIST = new Set([
  "details",
  "summary",
  "u",
  "sup",
  "sub",
  "span",
  "a",
  "img",
  "br",
  "video",
  "audio",
]);

function normalizeMarkdownLineBreaks(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// 抽出文件顶部的 YAML frontmatter（含起止 --- 行）。返回剩余 markdown body
// （跳过 frontmatter 之后的多余空行）。frontmatter 不入编辑器，保存时 prepend 回去。
export function extractFrontmatter(markdown: string): {
  frontmatter: string | null;
  body: string;
} {
  const normalized = normalizeMarkdownLineBreaks(markdown);
  const lines = normalized.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { frontmatter: null, body: normalized };
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { frontmatter: null, body: normalized };
  const frontmatter = lines.slice(0, endIdx + 1).join("\n");
  let bodyStart = endIdx + 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === "") {
    bodyStart += 1;
  }
  return { frontmatter, body: lines.slice(bodyStart).join("\n") };
}

function isHtmlCommentLine(trimmedLine: string): boolean {
  return trimmedLine.startsWith("<!--") && trimmedLine.endsWith("-->");
}

function getHtmlTagName(trimmedLine: string): string | null {
  return trimmedLine.match(/^<\/?([a-zA-Z][\w-]*)(?=[\s/>])/)?.[1].toLowerCase() ?? null;
}

function collectHtmlBlock(lines: string[], startIndex: number, tagName: string) {
  const first = lines[startIndex].trim();
  const voidElement = /^(?:area|base|embed|hr|input|link|meta|param|source|track|wbr)$/i.test(tagName);
  if (voidElement || /^<\//.test(first) || /\/>\s*$/.test(first)) {
    return { nextIndex: startIndex + 1, rawBlock: lines[startIndex] };
  }
  const tags = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  let depth = 0;
  let index = startIndex;
  for (; index < lines.length; index += 1) {
    for (const match of lines[index].matchAll(tags)) {
      if (/\/>$/.test(match[0])) continue;
      depth += match[1] ? -1 : 1;
    }
    if (depth <= 0) { index += 1; break; }
  }
  return { nextIndex: index, rawBlock: lines.slice(startIndex, index).join("\n") };
}

function fenceOpening(line: string) {
  const match = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
  return match && !(match[1][0] === "`" && match[2].includes("`")) ? match : null;
}

function fenceEnd(lines: string[], start: number, fence: string): number {
  const closing = new RegExp(`^[ \\t]*${fence[0]}{${fence.length},}[ \\t]*$`);
  let end = start + 1;
  while (end < lines.length && !closing.test(lines[end])) end += 1;
  return end;
}

function wrapRawBlock(rawBlock: string): string {
  return serializeFencedCode(`${RAW_BLOCK_MARKER}\n${rawBlock}`, RAW_BLOCK_LANGUAGE);
}

export function encodeUnsupportedMarkdownForEditor(markdown: string): string {
  const normalized = normalizeMarkdownLineBreaks(markdown);
  const lines = normalized.split("\n");
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const fence = fenceOpening(line);
    if (fence) {
      const end = fenceEnd(lines, index, fence[1]);
      output.push(...lines.slice(index, end < lines.length ? end + 1 : end));
      index = end < lines.length ? end + 1 : end;
      continue;
    }
    if (trimmed === "$$") {
      let end = index + 1;
      while (end < lines.length && lines[end].trim() !== "$$") end += 1;
      output.push(...lines.slice(index, end < lines.length ? end + 1 : end));
      index = end < lines.length ? end + 1 : end;
      continue;
    }

    if (!trimmed.startsWith("<") || isHtmlCommentLine(trimmed)) {
      output.push(line);
      index += 1;
      continue;
    }

    const tagName = getHtmlTagName(trimmed);
    // 仅放行本应用可无损解析的表格，整段跳过，避免 tbody/tr 被逐行包成 raw。
    if (tagName === "table" && /^<table\s+data-goose-table="v1"(?:\s|>)/i.test(trimmed)) {
      let end = index;
      while (end < lines.length && !/<\/table>\s*$/i.test(lines[end].trim())) end += 1;
      if (end < lines.length) {
        output.push(...lines.slice(index, end + 1));
        index = end + 1;
        continue;
      }
    }
    if (!tagName || INLINE_HTML_ALLOWLIST.has(tagName)) {
      output.push(line);
      index += 1;
      continue;
    }

    const { rawBlock, nextIndex } = collectHtmlBlock(lines, index, tagName);
    output.push(wrapRawBlock(rawBlock));
    index = nextIndex;
  }

  return output.join("\n");
}

export function decodeUnsupportedMarkdownForDisk(markdown: string): string {
  const lines = normalizeMarkdownLineBreaks(markdown).split("\n");
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() === "$$") {
      let end = index + 1;
      while (end < lines.length && lines[end].trim() !== "$$") end += 1;
      output.push(...lines.slice(index, end < lines.length ? end + 1 : end));
      index = end;
      continue;
    }
    const fence = fenceOpening(lines[index]);
    if (!fence) { output.push(lines[index]); continue; }
    const end = fenceEnd(lines, index, fence[1]);
    if (end >= lines.length) { output.push(...lines.slice(index)); break; }
    if (fence[2].trim().split(/\s+/)[0] === RAW_BLOCK_LANGUAGE) {
      const body = lines.slice(index + 1, end);
      if (/^\s*<!--\s*goose-note:raw-block\s*-->$/.test(body[0] || "")) body.shift();
      output.push(...body);
    } else {
      // 其他围栏中的 raw 示例仍然是代码，不能递归解包。
      output.push(...lines.slice(index, end + 1));
    }
    index = end;
  }
  return output.join("\n");
}
