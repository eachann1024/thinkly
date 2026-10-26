import type { PartialBlock } from "@blocknote/core";
import type { BlockNoteContent } from "./emptyContent";
import {
  TITLE_HEADING_LEVEL,
  createEmptyBlockNoteContent,
} from "./emptyContent";
import { normalizeBlocks } from "./normalizeBlocks";

function canUseAsHeadingContent(block: PartialBlock): boolean {
  if (block.type !== "paragraph") return false;
  return typeof block.content === "string" || Array.isArray(block.content);
}

export function ensureFirstTitleHeading(
  content: BlockNoteContent,
): BlockNoteContent {
  const [firstBlock, ...restBlocks] = content;

  if (!firstBlock) {
    return createEmptyBlockNoteContent();
  }

  if (firstBlock.type === "heading") {
    const nestedChildren = Array.isArray(firstBlock.children)
      ? firstBlock.children
      : [];
    const { children: headingChildren, ...titleBase } =
      firstBlock as PartialBlock;
    void headingChildren;
    const normalizedTitle = {
      ...titleBase,
      props: {
        ...firstBlock.props,
        level: TITLE_HEADING_LEVEL,
      },
    } as PartialBlock;

    return [normalizedTitle, ...nestedChildren, ...restBlocks];
  }

  if (canUseAsHeadingContent(firstBlock)) {
    const nestedChildren = Array.isArray(firstBlock.children)
      ? firstBlock.children
      : [];
    const content =
      typeof firstBlock.content === "string" ||
      Array.isArray(firstBlock.content)
        ? firstBlock.content
        : "";

    return [
      {
        type: "heading",
        props: {
          ...firstBlock.props,
          level: TITLE_HEADING_LEVEL,
        },
        content,
      } as unknown as PartialBlock,
      ...nestedChildren,
      ...restBlocks,
    ];
  }

  return content;
}

export function normalizeBlockContent(content: unknown): BlockNoteContent {
  if (!Array.isArray(content)) return [];
  return normalizeBlocks(content);
}

export function normalizeHeadingChildren(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.flatMap((block) => {
    const { children, ...rest } = block;
    const nested = Array.isArray(children) ? normalizeHeadingChildren(children) : [];
    return block.type === "heading"
      ? [rest as PartialBlock, ...nested]
      : [{ ...rest, ...(nested.length ? { children: nested } : {}) } as PartialBlock];
  });
}
