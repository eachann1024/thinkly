import {
  extractPlainText,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";

function normalizeTitleText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isMatchingPageH1(
  block: BlockNoteContent[number] | undefined,
  pageTitle: string,
): boolean {
  if (!block || (block as { type?: string }).type !== "heading") return false;
  const headingLevel = Number((block as { props?: { level?: number } }).props?.level) || 1;
  if (headingLevel !== 1) return false;
  const selectedTitle = normalizeTitleText(extractPlainText([block]));
  const generatedTitle = normalizeTitleText(pageTitle);
  return Boolean(selectedTitle && selectedTitle === generatedTitle);
}

export function getSelectionBlocksToRender(
  selectionBlocks: BlockNoteContent,
  pageTitle: string,
  showTitle: boolean,
): BlockNoteContent {
  if (!showTitle || selectionBlocks.length === 0) return selectionBlocks;
  return isMatchingPageH1(selectionBlocks[0], pageTitle)
    ? selectionBlocks.slice(1)
    : selectionBlocks;
}

export function splitImageExportTitle(params: {
  blocks: BlockNoteContent;
  pageTitle: string;
  showTitle: boolean;
  mode: "page" | "selection";
}): { blocks: BlockNoteContent; titleBlock: BlockNoteContent[number] | null } {
  const { blocks, pageTitle, showTitle, mode } = params;
  if (!showTitle || blocks.length === 0) {
    return { blocks, titleBlock: null };
  }

  const first = blocks[0];
  if (mode === "selection") {
    if (!isMatchingPageH1(first, pageTitle)) {
      return { blocks, titleBlock: null };
    }
    return { blocks: blocks.slice(1), titleBlock: first };
  }

  if ((first as { type?: string } | undefined)?.type !== "heading") {
    return { blocks, titleBlock: null };
  }
  return { blocks: blocks.slice(1), titleBlock: first };
}
