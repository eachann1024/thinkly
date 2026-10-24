import { indentLevel, parseNestedList } from "./nestedList";
import { parseHtmlBlock } from "./htmlBlocks";
import { parseTableHtmlBlock } from "./table";
import { parseCodeBlock } from "./codeBlocks";
import { parseFileBlock, parseImageBlock } from "./mediaBlocks";
import { frontmatterBodyHasUserVisibleKeys } from "@/lib/local-frontmatter";
import { parseInlineMarkdown } from "./inline";
import {
  isLegacyCodeBlockMetaComment,
  isThematicBreakLine,
  parseTableBlock,
} from "./blockHelpers";
import { NOTE_MARK_PATTERN } from "../persistedNames";
import {
  isBlockChildrenMarker,
  shouldSkipListSpacer,
  tryAttachBlockChildren,
} from "./blockChildren";
import { applyNoteMeta, splitGeneratedMarkdown } from "../noteMeta";
import { parseQuoteBlock } from "./quoteBlock";

/**
 * markdownToJsonContent 输出 **BlockNote PartialBlock[]**（数组，非 {type:"doc"}）。
 *
 * 为什么是 BlockNote 格式而不是 TipTap doc：
 * normalizePageContent 对数组输入走 normalizeBlocks（children 递归、attrs→props、
 * VALID_BLOCK_TYPES 直通），而对 {type:"doc"} 输入走 legacyNodeToBlocks——后者会
 * 丢弃 listItem.children（嵌套拍平）、orderedList start、imageResize 宽高对齐，
 * 并把 details/video/file 压成纯文本或直接丢掉。直接输出 BlockNote 格式可彻底
 * 绕开这条有损路径，保证 scanner 读入的 page.content 与磁盘 md 零损对应。
 */

// 返回类型标 any（运行时恒为 PartialBlock[] 数组）：调用方 entry.ts 仍有
// `Array.isArray(parsed) ? parsed : parsed?.content` 的双形状兼容分支，
// 标 any[] 会让 else 分支被 narrow 成 never 报 TS2339。
export function markdownToJsonContent(markdown: string): any {
  const split = splitGeneratedMarkdown(markdown);
  return applyNoteMeta(parseMarkdownBody(split.body), split.meta);
}

function pushBlankParagraphs(lines: string[], index: number, content: any[]): number {
  let blanks = 0;
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) {
    if (!shouldSkipListSpacer(lines, cursor)) blanks += 1;
    cursor += 1;
  }
  const empties = content.length === 0 || cursor >= lines.length ? blanks : Math.max(0, blanks - 1);
  for (let count = 0; count < empties; count += 1) content.push({ type: "paragraph" });
  return cursor;
}

function parseMarkdownBody(markdown: string): any {
  let source = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (source.endsWith("\n")) source = source.slice(0, -1);
  if (!source.trim()) return [];
  const lines = source.split("\n");
  const content: any[] = [];
  let i = 0;

  if (lines.length > 0 && lines[0].trim() === "---") {
    const frontmatterLines: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== "---") {
      frontmatterLines.push(lines[i]);
      i++;
    }
    if (i < lines.length && lines[i].trim() === "---") {
      const yamlBody = frontmatterLines.join("\n");
      // 只有用户属性才展示 YAML 块；仅 goose-favorite 等应用设置不进编辑器。
      if (frontmatterBodyHasUserVisibleKeys(yamlBody)) {
        content.push({
          type: "codeBlock",
          props: { language: "yaml-frontmatter" },
          content: yamlBody,
        });
      }
      i++;
    } else {
      i = 0;
    }
  }

  while (i < lines.length) {
    if (!lines[i].trim()) {
      i = pushBlankParagraphs(lines, i, content);
      continue;
    }
    const line = lines[i];
    const trimmedLine = line.trim();

    if (new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:empty-block=paragraph\\s*-->$`).test(trimmedLine)) {
      content.push({ type: "paragraph" });
      i++;
      continue;
    }

    if (new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:table-sequence\\s*-->$`).test(trimmedLine)) {
      const tableResult = parseTableHtmlBlock(lines, i + 1) ?? parseTableBlock(lines, i + 1, parseInlineMarkdown);
      if (tableResult) {
        tableResult.block.props = { ...(tableResult.block.props ?? {}), sequenceColumn: true };
        content.push(tableResult.block);
        i = tableResult.nextIndex;
        continue;
      }
    }

    const childWrapper = tryAttachBlockChildren(lines, i, content, parseMarkdownBody);
    if (childWrapper) {
      i = childWrapper.nextIndex;
      continue;
    }

    if (isLegacyCodeBlockMetaComment(trimmedLine)) {
      i++;
      continue;
    }

    const parseHtmlBlockResult = parseTableHtmlBlock(lines, i) ?? parseHtmlBlock(lines, i, parseMarkdownBody);
    if (parseHtmlBlockResult) {
      content.push(parseHtmlBlockResult.block);
      i = parseHtmlBlockResult.nextIndex;
      continue;
    }

    const parseCodeBlockResult = parseCodeBlock(lines, i);
    if (parseCodeBlockResult) {
      content.push(parseCodeBlockResult.block);
      i = parseCodeBlockResult.nextIndex;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        props: { level: headingMatch[1].length },
        content: parseInlineMarkdown(headingMatch[2]),
      });
      i++;
      continue;
    }

    // setext 标题：当前行是普通文本，下一行是 ===+（H1）或 ---+（H2）
    if (
      trimmedLine &&
      !trimmedLine.startsWith(">") &&
      !trimmedLine.startsWith("-") &&
      !trimmedLine.startsWith("#") &&
      !trimmedLine.startsWith("<") &&
      !trimmedLine.startsWith("|") &&
      i + 1 < lines.length
    ) {
      const nextTrimmed = lines[i + 1].trim();
      if (/^={2,}$/.test(nextTrimmed)) {
        content.push({
          type: "heading",
          props: { level: 1 },
          content: parseInlineMarkdown(trimmedLine),
        });
        i += 2;
        continue;
      }
      if (/^-{2,}$/.test(nextTrimmed)) {
        content.push({
          type: "heading",
          props: { level: 2 },
          content: parseInlineMarkdown(trimmedLine),
        });
        i += 2;
        continue;
      }
    }

    if (isThematicBreakLine(line)) {
      content.push({ type: "divider" });
      i++;
      continue;
    }

    const quote = parseQuoteBlock(lines, i);
    if (quote) {
      content.push(quote.block);
      i = quote.nextIndex;
      continue;
    }

    // Try parsing table
    const tableResult = parseTableBlock(lines, i, parseInlineMarkdown);
    if (tableResult) {
      content.push(tableResult.block);
      i = tableResult.nextIndex;
      continue;
    }

    const parseFileBlockResult = parseFileBlock(lines, i);
    if (parseFileBlockResult) {
      content.push(parseFileBlockResult.block);
      i = parseFileBlockResult.nextIndex;
      continue;
    }

    // 嵌套列表（task / bullet / ordered）
    const baseIndent = indentLevel(line);
    const stripped = line.slice(baseIndent);
    if (
      stripped.match(/^-\s+\[[ xX]\](?:\s+.*)?$/) ||
      stripped.match(/^[-*+](?:\s+\S|\s*$)/) ||
      stripped.match(/^\d+\.(?:\s+\S|\s*$)/)
    ) {
      const { items, nextIndex } = parseNestedList(
        lines,
        i,
        baseIndent,
        parseInlineMarkdown,
        parseMarkdownBody,
      );
      if (items.length) {
        content.push(...items);
        i = nextIndex;
        continue;
      }
    }

    const parseImageBlockResult = parseImageBlock(lines, i);
    if (parseImageBlockResult) {
      content.push(parseImageBlockResult.block);
      i = parseImageBlockResult.nextIndex;
      continue;
    }

    if (line.trim()) {
      const paragraphLines: string[] = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        const trimmed = currentLine.trim();

        if (!trimmed) break;

        if (paragraphLines.length > 0) {
          if (
            isBlockChildrenMarker(currentLine) ||
            currentLine.startsWith("#") ||
            currentLine.startsWith(">") ||
            /^ {0,3}(?:`{3,}|~{3,})/.test(currentLine) ||
            currentLine.startsWith("$$") ||
            currentLine.match(/^-\s+\[[ xX]\]/) ||
            currentLine.match(/^[-*+]\s+/) ||
            currentLine.match(/^\d+\.\s+/) ||
            isThematicBreakLine(currentLine) ||
            currentLine.match(/^\|/) ||
            currentLine.match(/^\[📎/) ||
            trimmed.match(/^<video\s+src=/) ||
            /^<details(?:\s|>)/i.test(trimmed) ||
            new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:(?:columns|column)\\b`, "i").test(trimmed) ||
            /^<table\s+data-(?:thinkly|goose)-table="v1"(?:\s|>)/i.test(trimmed) ||
            /^<audio\s+src=/i.test(trimmed)
          ) {
            break;
          }
          // 下一行是 setext 下划线 → 当前行是 setext 标题文本，停止收集
          const nextTrimmed = lines[i + 1]?.trim() ?? "";
          if (/^={2,}$/.test(nextTrimmed) || /^-{2,}$/.test(nextTrimmed)) {
            break;
          }
        }

        paragraphLines.push(currentLine);
        i++;
      }

      if (paragraphLines.length > 0) {
        // 软换行保真：段内换行用 \n 保留（BlockNote 文本内 \n = hardBreak）
        const combinedText = paragraphLines.join("\n");
        const inline = parseInlineMarkdown(combinedText);
        content.push(
          inline.length > 0
            ? { type: "paragraph", content: inline }
            : { type: "paragraph" },
        );
        continue;
      }
    }
    i++;
  }

  return content;
}
