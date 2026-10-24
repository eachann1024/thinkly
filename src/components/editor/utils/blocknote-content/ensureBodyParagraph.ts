import type { BlockNoteContent } from "./emptyContent";
import { emptyBlock, TITLE_HEADING_LEVEL } from "./emptyContent";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBlockType(block: unknown): string | null {
  if (!isRecord(block)) return null;
  return typeof block.type === "string" ? block.type : null;
}

function readHeadingLevel(block: unknown): number | null {
  if (!isRecord(block)) return null;
  if (!isRecord(block.props)) return null;
  return typeof block.props.level === "number" ? block.props.level : null;
}

export function ensureBodyParagraphAfterTitle(
  content: BlockNoteContent,
): BlockNoteContent {
  if (!Array.isArray(content) || content.length === 0) {
    return content;
  }
  if (content.length !== 1) return content;

  const first = content[0];
  if (readBlockType(first) !== "heading") return content;
  if (readHeadingLevel(first) !== TITLE_HEADING_LEVEL) return content;

  const next: BlockNoteContent = [first, emptyBlock()];
  return next;
}

export function needsBodyParagraphAfterTitle(
  blocks: ReadonlyArray<unknown>,
): boolean {
  if (blocks.length !== 1) return false;
  const first = blocks[0];
  if (readBlockType(first) !== "heading") return false;
  return readHeadingLevel(first) === TITLE_HEADING_LEVEL;
}
