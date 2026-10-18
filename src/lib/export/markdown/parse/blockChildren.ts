import {
  findBlockChildrenEnd,
  isBlockChildrenClose,
  isBlockChildrenOpen,
} from "../blockChildrenWrapper";

export function isBlockChildrenMarker(line: string): boolean {
  return isBlockChildrenOpen(line) || isBlockChildrenClose(line);
}

export function shouldSkipListSpacer(lines: string[], index: number): boolean {
  if (isBlockChildrenClose(lines[index - 1]?.trim() ?? "")) return true;
  for (let next = index + 1; next < lines.length; next += 1) {
    if (!lines[next].trim()) continue;
    return isBlockChildrenOpen(lines[next]?.trim() ?? "");
  }
  return false;
}

export function tryAttachBlockChildren(
  lines: string[],
  index: number,
  blocks: any[],
  parseMarkdown: (markdown: string) => any[],
): { handled: true; nextIndex: number } | null {
  const line = lines[index];
  if (isBlockChildrenClose(line)) {
    blocks.push({ type: "paragraph", content: line });
    return { handled: true, nextIndex: index + 1 };
  }
  if (!isBlockChildrenOpen(line) || blocks.length === 0) return null;

  const end = findBlockChildrenEnd(lines, index);
  if (end === null) return null;
  const children = parseMarkdown(lines.slice(index + 1, end).join("\n"));
  const parent = blocks[blocks.length - 1];
  parent.children = [...(parent.children ?? []), ...children];
  return { handled: true, nextIndex: end + 1 };
}
