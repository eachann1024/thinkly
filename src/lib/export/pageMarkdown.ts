import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { blocksToEditorHtml } from "./blocksToEditorHtml";


function isFirstBlockH1(block: unknown): boolean {
  if (!block || typeof block !== "object" || !("type" in block)) return false;
  if (block.type !== "heading") return false;
  if (!("props" in block) || !block.props || typeof block.props !== "object") {
    return false;
  }
  const level = "level" in block.props ? block.props.level : undefined;
  return (level ?? 1) === 1;
}

export function stripFirstH1(blocks: BlockNoteContent): BlockNoteContent {
  if (blocks.length > 0 && isFirstBlockH1(blocks[0])) {
    return blocks.slice(1);
  }
  return blocks;
}

export interface BuildExportMarkdownOptions {
  includeTitleHeading?: boolean;
}

export async function buildExportMarkdown(
  page: Page,
  blocks: BlockNoteContent,
  options: BuildExportMarkdownOptions = {},
): Promise<string> {
  const { blocksToMarkdown } = await import("./blocknoteSerializer");
  if (page.localFilePath) {
    return blocksToMarkdown(blocks);
  }
  const includeTitleHeading = options.includeTitleHeading ?? true;
  if (!includeTitleHeading) {
    return blocksToMarkdown(stripFirstH1(blocks));
  }
  const title = getPageTitle(page);
  const body = await blocksToMarkdown(stripFirstH1(blocks));
  return `# ${title}\n\n${body}`;
}

export async function buildExportHtmlBody(
  page: Page,
  blocks: BlockNoteContent,
): Promise<string> {
  const target = page.localFilePath ? blocks : stripFirstH1(blocks);
  return blocksToEditorHtml(target);
}
