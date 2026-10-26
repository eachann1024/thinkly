import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/local-folder-scanner/markdown.ts#localMessages:1">`
zh-Hans:
  couldnTReadTheMarkdownFile: "Markdown 文件读取失败"
  theYamlFrontmatterIsNotClosedTheOriginalFile: "YAML 前置区未闭合，原文件已保留，请修复后重新载入"
  couldnTParseMarkdown: "Markdown 解析失败"
en:
  couldnTReadTheMarkdownFile: "Couldn’t read the Markdown file"
  theYamlFrontmatterIsNotClosedTheOriginalFile: "The YAML frontmatter is not closed. The original file has been kept. Fix it and reload."
  couldnTParseMarkdown: "Couldn’t parse Markdown"
ja:
  couldnTReadTheMarkdownFile: "Markdown ファイルを読み込めませんでした"
  theYamlFrontmatterIsNotClosedTheOriginalFile: "YAML フロントマターが閉じられていません。元のファイルは保持されています。修正してから再読み込みしてください"
  couldnTParseMarkdown: "Markdown を解析できませんでした"
`;
const uiText = createTranslator(localMessages);
import { getParsedMarkdown, cacheParsedMarkdown } from "./parsed-cache";
import { hydrateNoteMetadata } from "@/lib/note-metadata/restore";
import { readIdentity } from "@/lib/note-metadata/identity";
import { validateLegacyNoteMetadata } from "@/lib/note-metadata/codec";
import { noteMetadataErrorMessage } from "@/lib/note-metadata/messages";
import {
  encodeUnsupportedMarkdownForEditor,
  extractFrontmatter,
} from "@/lib/markdown-raw-guard";
import { parseLocalFrontmatterBlob } from "@/lib/local-frontmatter";
import {
  restoreBlockPropsMarkers,
  unwrapLocalBlockPropsWrappers,
} from "@/lib/export/markdown/blockPropsMarker";
import {
  setLocalMdSnapshot,
  updateSnapshotStat,
  type LocalMdFileStat,
} from "@/lib/local-md-snapshot";
import type { FontFamily, JSONContent, Page } from "@/types";
import {
  buildLocalPageId,
  normalizeLocalFileTitle,
  type LocalFolderEntry,
} from "./entries";

export interface ParsedLocalMarkdown {
  content: JSONContent;
  frontmatter?: string;
  fontFamily: FontFamily;
  pageLayout?: import("@/types").PageLayout;
  isLocked: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  readState: "ready" | "error";
  readError?: string;
  metadataRevision?: string | null;
  metadataId?: string;
}

export async function parseLocalMarkdownContent(
  markdown: string | null,
  fallbackTitle: string,
  readError?: string,
  context?: { root: string; fs: GooseFs; filePath?: string; metadataCatalog?: Promise<import("@/lib/note-metadata/contract").NoteMetadataEnvelope[]> },
): Promise<ParsedLocalMarkdown> {
  if (markdown === null) {
    return {
      content: [] as unknown as JSONContent,
      fontFamily: "default",
      isLocked: false,
      isPinned: false,
      isFavorite: false,
      readState: "error",
      readError: readError || uiText("couldnTReadTheMarkdownFile"),
    };
  }

  const { frontmatter } = extractFrontmatter(markdown);
  let hydratedMarkdown = markdown;
  let metadataRevision: string | null | undefined;
  let metadataId: string | undefined;
  let metadataError: string | undefined;
  let metadataSettings: import("@/lib/note-metadata/contract").NoteSettings | undefined;
  try {
    metadataId = readIdentity(markdown);
    if (context) {
      if (!context) throw new Error("无法定位此笔记的隐藏元数据，请从所属笔记本打开");
      const restored = await hydrateNoteMetadata(context.fs, context.root, markdown, context.filePath, context.metadataCatalog);
      metadataId = restored.noteId;
      hydratedMarkdown = restored.legacyMarkdown;
      metadataRevision = restored.revision;
      metadataSettings = restored.settings;
    } else validateLegacyNoteMetadata(markdown);
  } catch (error) {
    metadataError = noteMetadataErrorMessage(error);
  }
  const unclosedFrontmatter =
    /^---[^\S\r\n]*(?:\r?\n|$)/.test(markdown) && !frontmatter;
  const fmSettings = metadataSettings ?? parseLocalFrontmatterBlob(frontmatter).settings;
  const encodedMd = encodeUnsupportedMarkdownForEditor(
    unwrapLocalBlockPropsWrappers(hydratedMarkdown),
  );
  const { importFromMarkdown } = await import("@/lib/export/markdown/parse");
  const imported = await importFromMarkdown(encodedMd, fallbackTitle, {
    preserveStructure: true,
  });
  const importedBlocks = Array.isArray(imported.content)
    ? imported.content
    : [];

  return {
    content: restoreBlockPropsMarkers(
      importedBlocks as any,
    ) as unknown as JSONContent,
    frontmatter: frontmatter || undefined,
    fontFamily: fmSettings.fontFamily,
    pageLayout: fmSettings.pageLayout,
    isLocked: fmSettings.isLocked,
    isPinned: fmSettings.isPinned,
    isFavorite: fmSettings.isFavorite,
    metadataId,
    metadataRevision,
    readState: imported.success && !unclosedFrontmatter && !metadataError ? "ready" : "error",
    readError: unclosedFrontmatter
      ? uiText("theYamlFrontmatterIsNotClosedTheOriginalFile")
      : imported.success
        ? metadataError
        : imported.error || metadataError || uiText("couldnTParseMarkdown"),
  };
}

export async function buildMarkdownPage(
  notebookId: string,
  basePath: string,
  entry: LocalFolderEntry,
  readResult: {
    content: string | null;
    error?: string;
    stat?: LocalMdFileStat;
  },
  now: number,
  resolvedId?: string,
  cacheScope = basePath,
  fs?: GooseFs,
  metadataCatalog?: Promise<import("@/lib/note-metadata/contract").NoteMetadataEnvelope[]>,
): Promise<Page> {
  const fallbackTitle = normalizeLocalFileTitle(entry.name);
  const fileId =
    resolvedId ?? buildLocalPageId(notebookId, basePath, entry.path);
  const cached =
    !fs && typeof readResult.content === "string" && !readResult.content.includes("goose-id")
      ? getParsedMarkdown(
          entry.path,
          readResult.content,
          fallbackTitle,
          cacheScope,
        )
      : undefined;
  const parsed =
    cached ??
    (await parseLocalMarkdownContent(
      readResult.content,
      fallbackTitle,
      readResult.error,
      fs ? { root: basePath, fs, filePath: entry.path, metadataCatalog } : undefined,
    ));

  if (typeof readResult.content === "string") {
    setLocalMdSnapshot(entry.path, readResult.content);
    if (!cached && !parsed.metadataId)
      cacheParsedMarkdown(
        entry.path,
        readResult.content,
        fallbackTitle,
        cacheScope,
        parsed,
      );
    if (readResult.stat) {
      updateSnapshotStat(entry.path, readResult.stat);
    }
  }

  return {
    id: fileId,
    workspaceId: notebookId,
    content: parsed.content,
    isFolder: false,
    isLocked: parsed.isLocked,
    isPinned: parsed.isPinned || undefined,
    pinnedAt: parsed.isPinned ? now : undefined,
    isFavorite: parsed.isFavorite || undefined,
    fontSize: "default",
    fontFamily: parsed.fontFamily,
    pageLayout: parsed.pageLayout,
    localFilePath: entry.path,
    localFrontmatter: parsed.frontmatter,
    localMetadataId: parsed.metadataId,
    localMetadataRevision: parsed.metadataRevision,
    localReadState: parsed.readState,
    localReadError: parsed.readError,
    createdAt: now,
    updatedAt: now,
  };
}
