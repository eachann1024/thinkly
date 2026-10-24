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
}

export async function parseLocalMarkdownContent(
  markdown: string | null,
  fallbackTitle: string,
  readError?: string,
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
  const unclosedFrontmatter =
    /^---[^\S\r\n]*(?:\r?\n|$)/.test(markdown) && !frontmatter;
  const fmSettings = parseLocalFrontmatterBlob(frontmatter).settings;
  const encodedMd = encodeUnsupportedMarkdownForEditor(
    unwrapLocalBlockPropsWrappers(markdown),
  );
  const { importFromMarkdown } = await import("@/lib/export");
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
    readState: imported.success && !unclosedFrontmatter ? "ready" : "error",
    readError: unclosedFrontmatter
      ? uiText("theYamlFrontmatterIsNotClosedTheOriginalFile")
      : imported.success
        ? undefined
        : imported.error || uiText("couldnTParseMarkdown"),
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
): Promise<Page> {
  const fallbackTitle = normalizeLocalFileTitle(entry.name);
  const fileId =
    resolvedId ?? buildLocalPageId(notebookId, basePath, entry.path);
  const cached =
    typeof readResult.content === "string"
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
    ));

  if (typeof readResult.content === "string") {
    setLocalMdSnapshot(entry.path, readResult.content);
    if (!cached)
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
    localReadState: parsed.readState,
    localReadError: parsed.readError,
    createdAt: now,
    updatedAt: now,
  };
}
