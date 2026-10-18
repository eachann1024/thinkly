import { noteComment, noteCommentClose } from "./persistedNames";

/** Explicit, readable Markdown envelope for block children that Markdown has no native syntax for. */
export const BLOCK_CHILDREN_OPEN = noteComment("block-children v1");
export const BLOCK_CHILDREN_CLOSE = noteCommentClose("block-children");
const LEGACY_BLOCK_CHILDREN_OPEN = "<!-- goose-note:block-children v1 -->";
const LEGACY_BLOCK_CHILDREN_CLOSE = "<!-- /goose-note:block-children -->";

export function isBlockChildrenOpen(line: string): boolean {
  return line === BLOCK_CHILDREN_OPEN || line === LEGACY_BLOCK_CHILDREN_OPEN;
}

export function isBlockChildrenClose(line: string): boolean {
  return line === BLOCK_CHILDREN_CLOSE || line === LEGACY_BLOCK_CHILDREN_CLOSE;
}

export function wrapBlockChildrenMarkdown(markdown: string): string {
  if (!markdown) return "";
  return `${BLOCK_CHILDREN_OPEN}\n${markdown}\n${BLOCK_CHILDREN_CLOSE}`;
}

/** Find a balanced wrapper; malformed/incomplete markers are left to the normal parser as visible text. */
export function findBlockChildrenEnd(lines: string[], start: number): number | null {
  if (!isBlockChildrenOpen(lines[start])) return null;
  let depth = 1;
  let fence: { character: "`" | "~"; length: number } | null = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const fenceMatch = lines[index].match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const token = fenceMatch[1];
      if (!fence) {
        fence = { character: token[0] as "`" | "~", length: token.length };
      } else if (
        token[0] === fence.character &&
        token.length >= fence.length &&
        /^\s*(?:`{3,}|~{3,})\s*$/.test(lines[index])
      ) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;
    if (isBlockChildrenOpen(lines[index])) depth += 1;
    else if (isBlockChildrenClose(lines[index]) && --depth === 0) return index;
  }
  return null;
}
