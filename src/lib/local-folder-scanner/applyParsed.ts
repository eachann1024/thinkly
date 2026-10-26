import type { Page } from "@/types";
import type { ParsedLocalMarkdown } from "./markdown";

export function pageWithParsedMarkdown(page: Page, parsed: ParsedLocalMarkdown): Page {
  return {
    ...page,
    content: parsed.content,
    localFrontmatter: parsed.frontmatter,
    localMetadataId: parsed.metadataId,
    localMetadataRevision: parsed.metadataRevision,
    fontFamily: parsed.fontFamily,
    pageLayout: parsed.pageLayout,
    isLocked: parsed.isLocked,
    isPinned: parsed.isPinned,
    isFavorite: parsed.isFavorite,
    pinnedAt: parsed.isPinned ? page.pinnedAt ?? Date.now() : undefined,
    favoriteOrder: parsed.isFavorite ? page.favoriteOrder : undefined,
    localReadState: parsed.readState,
    localReadError: parsed.readError,
    updatedAt: Date.now(),
  };
}
