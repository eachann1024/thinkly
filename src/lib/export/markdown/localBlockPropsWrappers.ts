import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { NOTE_MARK_PATTERN, noteComment } from "./persistedNames";
import { documentTextColors } from "@/lib/textColors";
import { INLINE_BLOCK_TYPES, pickPersistedBlockProps, sanitizeCssColor, type MarkdownBlock, type PersistedBlockProps } from "./blockPropsProperties";

const LOCAL_WRAPPABLE_BLOCK_TYPES = new Set(
  [...INLINE_BLOCK_TYPES].filter((type) => type !== "toggleListItem"),
);
export const LOCAL_BLOCK_PROPS_WRAPPER_STYLE = "__gooseLocalBlockPropsWrapperStyle";
export const LOCAL_PRESERVE_EMPTY_PARAGRAPH = "__gooseLocalPreserveEmptyParagraph";
const LOCAL_TEXT_COLOR_CSS = documentTextColors("light");
const LEGACY_LOCAL_TEXT_COLOR_CSS: Record<string, string> = {
  gray: "#9b9a97", brown: "#64473a", red: "#e03e3e", orange: "#d9730d",
  yellow: "#dfab01", green: "#4d6461", blue: "#0b6e99", purple: "#6940a5", pink: "#ad1a72",
};
const LOCAL_BG_COLOR_CSS: Record<string, string> = {
  gray: "#ebeced", brown: "#e9e5e3", red: "#fbe4e4", orange: "#f6e9d9",
  yellow: "#fbf3db", green: "#ddedea", blue: "#ddebf1", purple: "#eae4f2", pink: "#f4dfeb",
};

function localCssColor(color: string, palette: Record<string, string>) {
  return palette[color] ?? color;
}

function localColorName(color: string, palette: Record<string, string>, legacyPalette: Record<string, string> = {}) {
  const match = [...Object.entries(palette), ...Object.entries(legacyPalette)]
    .find(([, css]) => css.toLowerCase() === color.toLowerCase());
  return match?.[0] ?? sanitizeCssColor(color);
}

function localWrapperStyle(metadata: PersistedBlockProps, textPalette = LOCAL_TEXT_COLOR_CSS): string {
  const styles = ["display:block"];
  if (metadata.textAlignment === "center" || metadata.textAlignment === "right") {
    styles.push(`text-align:${metadata.textAlignment}`);
  }
  if (metadata.textColor && metadata.textColor !== "default") {
    styles.push(`color:${localCssColor(metadata.textColor, textPalette)}`);
  }
  if (metadata.backgroundColor && metadata.backgroundColor !== "default") {
    styles.push(`background-color:${localCssColor(metadata.backgroundColor, LOCAL_BG_COLOR_CSS)}`);
  }
  return styles.join("; ");
}


export function encodeLocalBlockPropsWrappers(
  blocks: BlockNoteContent,
  { preserveEmptyParagraphs = false } = {},
): BlockNoteContent {
  return (blocks as MarkdownBlock[]).map((block) => {
    const children = Array.isArray(block.children)
      ? encodeLocalBlockPropsWrappers(block.children as BlockNoteContent, { preserveEmptyParagraphs })
      : undefined;
    const metadata = block.type && (LOCAL_WRAPPABLE_BLOCK_TYPES.has(block.type) || block.type === "toggleListItem")
      ? pickPersistedBlockProps(block.props)
      : {};
    const hasStyle = Object.keys(metadata).length > 0;
    return {
      ...block,
      ...(hasStyle || (preserveEmptyParagraphs && block.type === "paragraph")
        ? { props: {
          ...(block.props ?? {}),
          ...(hasStyle ? { [LOCAL_BLOCK_PROPS_WRAPPER_STYLE]: localWrapperStyle(metadata) } : {}),
          ...(preserveEmptyParagraphs && block.type === "paragraph" ? { [LOCAL_PRESERVE_EMPTY_PARAGRAPH]: true } : {}),
        } }
        : {}),
      ...(children ? { children } : {}),
    };
  }) as BlockNoteContent;
}

export function wrapLocalBlockPropsMarkdown(_block: MarkdownBlock, markdown: string): string {
  return markdown;
}

function parseLocalWrapperStyle(style: string): PersistedBlockProps | null {
  const tokens = style.split("; ");
  if (tokens[0] !== "display:block") return null;
  const raw: Record<string, unknown> = {};
  for (const token of tokens.slice(1)) {
    const [name, value, ...rest] = token.split(":");
    if (rest.length > 0 || !value) return null;
    if (name === "text-align") raw.textAlignment = value;
    else if (name === "color") raw.textColor = localColorName(value, LOCAL_TEXT_COLOR_CSS, LEGACY_LOCAL_TEXT_COLOR_CSS);
    else if (name === "background-color") raw.backgroundColor = localColorName(value, LOCAL_BG_COLOR_CSS);
    else return null;
  }
  const metadata = pickPersistedBlockProps(raw);
  return Object.keys(metadata).length > 0 && (
    localWrapperStyle(metadata) === style ||
    localWrapperStyle(metadata, LEGACY_LOCAL_TEXT_COLOR_CSS) === style
  )
    ? metadata
    : null;
}

export function unwrapLocalBlockPropsWrappers(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  const prefix = "\\s*(?:(?:#{1,6}\\s+)|(?:[-*+]\\s+(?:\\[[ xX]\\]\\s+)?|\\d+\\.\\s+)|(?:>\\s+(?:\\[![A-Z]+\\]\\s+\\S+\\s+)?))?";
  const openPattern = new RegExp(`^(${prefix})(<span data-(?:thinkly|goose)-note-block-props="v1" style="([^"]+)">)(.*)$`);
  const blockBoundary = new RegExp(`^(?:\\s*$|\\s*#{1,6}\\s+|\\s*>|\\s*(?:[-*+]\\s+|\\d+\\.\\s+)|\\s*(?:\`{3,}|~{3,})|\\s*<details(?:\\s|>)|\\s*<!--\\s*${NOTE_MARK_PATTERN}:columns\\b)`);
  const marker = (metadata: PersistedBlockProps) =>
    noteComment(`block-props=${encodeURIComponent(JSON.stringify({ v: 1, ...metadata }))}`);
  let fence: { char: "`" | "~"; length: number } | null = null;
  let previousQuoteStyle: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch && !fence) {
      const token = fenceMatch[1];
      fence = { char: token[0] as "`" | "~", length: token.length };
      output.push(line);
      previousQuoteStyle = null;
      continue;
    }
    if (fence) {
      const closeFence = new RegExp(`^\\s*${fence.char}{${fence.length},}\\s*$`);
      if (closeFence.test(line)) fence = null;
      output.push(line);
      continue;
    }

    const summary = line.match(/^(<summary>(?:<h[1-3]>)?)<span data-(?:thinkly|goose)-note-block-props="v1" style="([^"]+)">(.*)<\/span>((?:<\/h[1-3]>)?<\/summary>)$/);
    if (summary) {
      const metadata = parseLocalWrapperStyle(summary[2]);
      output.push(metadata ? `${summary[1]}${marker(metadata)}${summary[3]}${summary[4]}` : line);
      previousQuoteStyle = null;
      continue;
    }

    const opening = line.match(openPattern);
    if (!opening) {
      output.push(line);
      previousQuoteStyle = null;
      continue;
    }
    const [, linePrefix, , style, initialInner] = opening;
    const metadata = parseLocalWrapperStyle(style);
    if (!metadata) {
      output.push(line);
      previousQuoteStyle = null;
      continue;
    }
    const isQuote = /^\s*>/.test(linePrefix);
    const closeOnLine = initialInner.lastIndexOf("</span>");
    if (closeOnLine >= 0 && initialInner.slice(closeOnLine + 7) === "") {
      const inner = initialInner.slice(0, closeOnLine);
      output.push(`${linePrefix}${isQuote && previousQuoteStyle === style ? "" : marker(metadata)}${inner}`);
      previousQuoteStyle = isQuote ? style : null;
      continue;
    }

    if (isQuote || /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(linePrefix)) {
      output.push(line);
      previousQuoteStyle = null;
      continue;
    }
    const innerLines = [initialInner];
    let depth = 1 + (initialInner.match(/<span\b/gi)?.length ?? 0) - (initialInner.match(/<\/span>/gi)?.length ?? 0);
    let closedAt = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (blockBoundary.test(lines[j])) break;
      const opens = lines[j].match(/<span\b/gi)?.length ?? 0;
      const closes = lines[j].match(/<\/span>/gi)?.length ?? 0;
      depth += opens - closes;
      innerLines.push(lines[j]);
      if (depth === 0 && lines[j].endsWith("</span>")) {
        innerLines[innerLines.length - 1] = lines[j].slice(0, -7);
        closedAt = j;
        break;
      }
      if (depth < 0) break;
    }
    if (closedAt < 0) {
      output.push(line);
      previousQuoteStyle = null;
      continue;
    }
    output.push(`${linePrefix}${marker(metadata)}${innerLines.join("\n")}`);
    i = closedAt;
    previousQuoteStyle = null;
  }
  return output.join("\n");
}
