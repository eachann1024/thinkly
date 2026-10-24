import { NOTE_MARK_PATTERN } from "../persistedNames";
import { parseInlineMarkdown } from "./inline";

/** 引用和标注。旧文件里的图标注释仍读回，新文件不再写这行注释。 */
export function parseQuoteBlock(
  lines: string[],
  index: number,
): { block: any; nextIndex: number } | null {
  const line = lines[index];
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith(">")) return null;
  const firstLine = trimmedLine.slice(1).trim();
  const calloutMatch = firstLine.match(/^\[!INFO\]\s+(\S+)\s+(.*)$/i);
  if (calloutMatch) {
    let icon = calloutMatch[1];
    let firstContent = calloutMatch[2];
    const iconMarker = firstContent.match(new RegExp(`^<!--\\s*${NOTE_MARK_PATTERN}:callout-icon=([^\\s]+)\\s*-->`));
    if (iconMarker) {
      try {
        icon = decodeURIComponent(iconMarker[1]);
        firstContent = firstContent.slice(iconMarker[0].length);
      } catch { /* 保留原文。 */ }
    }
    const calloutLines: string[] = [firstContent];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim().startsWith(">")) {
      calloutLines.push(lines[cursor].trim().slice(1).trim());
      cursor += 1;
    }
    return {
      block: { type: "callout", props: { icon }, content: parseInlineMarkdown(calloutLines.join("\n")) },
      nextIndex: cursor,
    };
  }
  const quoteLines: string[] = [firstLine];
  let cursor = index + 1;
  while (cursor < lines.length && lines[cursor].trim().startsWith(">")) {
    quoteLines.push(lines[cursor].trim().slice(1).trim());
    cursor += 1;
  }
  return {
    block: { type: "quote", content: parseInlineMarkdown(quoteLines.join("\n")) },
    nextIndex: cursor,
  };
}
