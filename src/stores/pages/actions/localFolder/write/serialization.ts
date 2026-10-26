import type { Page } from "@/types";
import { useNotebooks } from "@/stores/useNotebooks";
import { mergeLocalPageSettingsIntoFrontmatter, mergeSettingsIntoFrontmatterHeader } from "@/lib/local-frontmatter";
import { stripNoteMetaBlob } from "@/lib/export/markdown/noteMeta";
import { decodeUnsupportedMarkdownForDisk } from "@/lib/markdown-raw-guard";
import { applyTrailingNewlineStyle } from "@/lib/local-md-snapshot";
import { finalizePreparedMarkdown, prepareNoteMetadata } from "@/lib/note-metadata/codec";
import type { PreparedNoteMetadata } from "@/lib/note-metadata/contract";
import { canonicalRelativePath } from "@/lib/canonicalLocalPath";

export async function serializeLocalSave(page: Page, filePath: string, markdownContent: string) {
  const settings = {
    fontFamily: page.fontFamily ?? "default",
    pageLayout: page.pageLayout,
    isLocked: Boolean(page.isLocked),
    isPinned: Boolean(page.isPinned),
    isFavorite: Boolean(page.isFavorite),
  };
  const mergedHeader = mergeSettingsIntoFrontmatterHeader(markdownContent, settings);
  let frontmatter: string | undefined;
  let legacyMarkdown: string;
  if (mergedHeader) {
    legacyMarkdown = mergedHeader.markdown;
    frontmatter = mergedHeader.frontmatter;
  } else {
    const merged = mergeLocalPageSettingsIntoFrontmatter(page.localFrontmatter, settings);
    if (merged.parseFailed) throw new Error("YAML 前置区格式异常，已阻止保存");
    frontmatter = stripNoteMetaBlob(merged.blob);
    legacyMarkdown = frontmatter ? `${frontmatter}\n\n${markdownContent}` : markdownContent;
  }
  const root = useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  let metadata: PreparedNoteMetadata | undefined;
  let diskContent: string;
  if (root) {
    if (canonicalRelativePath(root, filePath) === null) throw new Error("笔记不在所属笔记本目录内");
    metadata = await prepareNoteMetadata(decodeUnsupportedMarkdownForDisk(legacyMarkdown), page.id, settings);
    diskContent = applyTrailingNewlineStyle(filePath, metadata.cleanMarkdown);
    metadata = await finalizePreparedMarkdown(metadata, diskContent);
    frontmatter = metadata.frontmatter;
  } else {
    diskContent = applyTrailingNewlineStyle(filePath, decodeUnsupportedMarkdownForDisk(legacyMarkdown));
  }
  return { diskContent, frontmatter, metadata, root };
}
