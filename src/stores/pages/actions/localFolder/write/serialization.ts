import { LEGACY_SETTING_KEYS, NOTE_ID_KEY, splitFrontmatter, readIdentity } from "@/lib/note-metadata/identity";
import { settingsOnlySaveToken } from "@/lib/note-metadata/settingsSave";
import { findNoteMetadata } from "@/lib/note-metadata/lookup";
import { reanchorNoteMeta } from "@/lib/note-metadata/reanchor";
import { prepareNoteMetadata as prepareDiskMetadata } from "@/lib/note-metadata/codec";
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
  const settingsSaveToken = settingsOnlySaveToken(page.id);
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
  const root = page.localMetadataRoot ?? useNotebooks.getState().notebooks[page.workspaceId]?.localPath;
  let metadata: PreparedNoteMetadata | undefined;
  let diskContent: string;
  if (root) {
    if (canonicalRelativePath(root, filePath) === null) throw new Error("笔记不在所属笔记本目录内");
    const identity = page.localMetadataId ?? readIdentity(legacyMarkdown) ?? crypto.randomUUID();
    if (settingsSaveToken !== undefined && window.gooseFs?.readFileAsync) {
      const raw = await window.gooseFs.readFileAsync(filePath);
      if (raw === null) throw new Error("Cannot read settings baseline");
      const existing = await findNoteMetadata(window.gooseFs, root, raw, filePath);
      metadata = await prepareDiskMetadata(raw, identity, settings);
      if (existing) metadata.payload.meta = reanchorNoteMeta(existing.current.markdown, raw, existing.current.meta);
      const { document } = splitFrontmatter(raw);
      if (![NOTE_ID_KEY, "goose-note", ...LEGACY_SETTING_KEYS].some(key => document.has(key))) {
        metadata.cleanMarkdown = raw;
        metadata = await finalizePreparedMarkdown(metadata, raw);
      }
    } else metadata = await prepareNoteMetadata(decodeUnsupportedMarkdownForDisk(legacyMarkdown), identity, settings);
    metadata.relativePath = canonicalRelativePath(root, filePath)!;
    diskContent = settingsSaveToken !== undefined ? metadata.cleanMarkdown : applyTrailingNewlineStyle(filePath, metadata.cleanMarkdown);
    metadata = await finalizePreparedMarkdown(metadata, diskContent);
    frontmatter = metadata.frontmatter;
  } else {
    diskContent = applyTrailingNewlineStyle(filePath, decodeUnsupportedMarkdownForDisk(legacyMarkdown));
  }
  return { diskContent, frontmatter, metadata, root, settingsSaveToken };
}
