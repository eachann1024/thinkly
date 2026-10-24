export type { BlockNoteContent } from "./emptyContent";
export {
  TITLE_HEADING_LEVEL,
  emptyBlock,
  titleHeadingBlock,
  createEmptyBlockNoteContent,
  createEmptyLocalPageContent,
  isBlockNoteContent,
} from "./emptyContent";

export type { LegacyPageContent, PageContent } from "./legacyMigration";
export { normalizePageContent } from "./legacyMigration";

export {
  VALID_BLOCK_TYPES,
  LEGACY_BLOCK_TYPES,
  simpleExtractText,
  hasStructuredBlocks,
  normalizeBlocks,
  normalizeBlockContent,
  ensureFirstTitleHeading,
  normalizeHeadingSectionFold,
  normalizeHeadingToggleableFlags,
} from "./normalize";
export {
  ensureBodyParagraphAfterTitle,
  needsBodyParagraphAfterTitle,
} from "./ensureBodyParagraph";

export { createEditorSafeContent } from "./editorSafeContent";

import type { PartialBlock } from "@blocknote/core";
import type { PageContent } from "./legacyMigration";
import type { BlockNoteContent } from "./emptyContent";
import { isBlockNoteContent } from "./emptyContent";
import { hasStructuredBlocks, simpleExtractText } from "./normalize";
import { normalizePageContent } from "./legacyMigration";
import type { LegacyPageContent } from "./legacyMigration";

export function clonePageContent<T extends PageContent>(content: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(content) as T;
    } catch {
    }
  }
  return JSON.parse(JSON.stringify(content)) as T;
}

export function getContentSignature(content: unknown): string {
  try {
    return JSON.stringify(content ?? null, (key, value) => {
      if (key === "id") return undefined;
      if (key === "children" && Array.isArray(value) && value.length === 0) {
        return undefined;
      }
      return value;
    });
  } catch {
    return "__goose-note-unserializable-content__";
  }
}

function textFromLegacyNode(node: LegacyPageContent | undefined): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return node.content.map(textFromLegacyNode).join("");
}

export function extractPlainText(content: PageContent | undefined): string {
  if (!content) return "";
  if (!isBlockNoteContent(content)) {
    if (typeof content === "object" && (content as any).type !== "doc") {
      return simpleExtractText(content as any).trim();
    }
    return textFromLegacyNode(content as LegacyPageContent).trim();
  }

  const parts: string[] = [];
  const visit = (block: any) => {
    const text = simpleExtractText(block);
    if (text) parts.push(text);
    for (const child of block.children ?? []) visit(child);
  };
  for (const block of content as PartialBlock[]) visit(block);
  return parts.join(" ").trim();
}

export function extractBlockNoteTitle(
  content: PageContent | undefined,
): string {
  try {
    const heading = Array.isArray(content) ? content[0] : undefined;
    if (
      heading?.type === "heading" &&
      typeof heading === "object" &&
      !Array.isArray(heading) &&
      !("attrs" in heading) &&
      (heading.children == null || Array.isArray(heading.children)) &&
      (heading.props == null ||
        (typeof heading.props === "object" && !Array.isArray(heading.props))) &&
      (typeof heading.content === "string" ||
        (Array.isArray(heading.content) && !hasStructuredBlocks(heading.content)))
    ) {
      const inlineText = simpleExtractText({ content: heading.content }).trim();
      if (
        inlineText ||
        heading.children == null ||
        (Array.isArray(heading.children) && heading.children.length === 0)
      ) {
        return (
          simpleExtractText({ content: heading.content, props: heading.props }).trim() ||
          "无标题"
        );
      }
    }
    const blocks = normalizePageContent(content);
    const first = blocks[0] as any;
    if (first?.type === "heading") {
      const text = extractPlainText([first] as BlockNoteContent);
      if (text) return text;
    }
    return "无标题";
  } catch {
    return "无标题";
  }
}
