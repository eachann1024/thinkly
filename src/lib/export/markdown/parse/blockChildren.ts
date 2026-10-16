import {
  BLOCK_CHILDREN_CLOSE,
  BLOCK_CHILDREN_OPEN,
  findBlockChildrenEnd,
} from "../blockChildrenWrapper";

export function isBlockChildrenMarker(line: string): boolean {
  return line === BLOCK_CHILDREN_OPEN || line === BLOCK_CHILDREN_CLOSE;
}

export function shouldSkipListSpacer(lines: string[], index: number): boolean {
  if (lines[index - 1]?.trim() === BLOCK_CHILDREN_CLOSE) return true;
  for (let next = index + 1; next < lines.length; next += 1) {
    if (!lines[next].trim()) continue;
    return lines[next]?.trim() === BLOCK_CHILDREN_OPEN;
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
  if (line === BLOCK_CHILDREN_CLOSE) {
    blocks.push({ type: "paragraph", content: line });
    return { handled: true, nextIndex: index + 1 };
  }
  if (line !== BLOCK_CHILDREN_OPEN || blocks.length === 0) return null;

  const end = findBlockChildrenEnd(lines, index);
  if (end === null) return null;
  const children = parseMarkdown(lines.slice(index + 1, end).join("\n"));
  const parent = blocks[blocks.length - 1];
  parent.children = [...(parent.children ?? []), ...children];
  return { handled: true, nextIndex: end + 1 };
}
