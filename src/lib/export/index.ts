import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/export/index.ts#localMessages:1">`
zh-Hans:
  readError: "读取文件失败：{{error}}"
  invalidJsonTheContentFieldIsMissing: "无效的 JSON 格式：缺少 content 字段"
  couldnTParseTheJsonFile: "解析 JSON 失败"
  noteFiles: "笔记文件"
  noFileSelected: "未选择文件"
  unsupportedFileFormat: "不支持的文件格式"
  couldnTReadTheFile: "读取文件失败"
en:
  readError: "Couldn’t read the file: {{error}}"
  invalidJsonTheContentFieldIsMissing: "Invalid JSON: the content field is missing"
  couldnTParseTheJsonFile: "Couldn’t parse the JSON file"
  noteFiles: "Note files"
  noFileSelected: "No file selected"
  unsupportedFileFormat: "Unsupported file format"
  couldnTReadTheFile: "Couldn’t read the file"
ja:
  readError: "ファイルを読み込めませんでした: {{error}}"
  invalidJsonTheContentFieldIsMissing: "JSON 形式が無効です。content フィールドがありません"
  couldnTParseTheJsonFile: "JSON ファイルを解析できませんでした"
  noteFiles: "ノートファイル"
  noFileSelected: "ファイルが選択されていません"
  unsupportedFileFormat: "サポートされていないファイル形式です"
  couldnTReadTheFile: "ファイルを読み込めませんでした"
`;
const uiText = createTranslator(localMessages);
import type { Page } from "@/types";
import type { CustomFonts } from "@/stores/useSettings";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { extractTitleFromContent } from "@/components/editor/utils/content-text-extractor";
import {
  pickImportFile,
  saveDocumentBlobAndReveal,
} from "./documentFileDialogs";

type BlockNoteSerializer = typeof import("./blocknoteSerializer");
type MarkdownParser = typeof import("./markdown/parse");
type ZipBundle = typeof import("./zipBundle");
type PageExport = typeof import("./pageWithAttachments");

export { jsonContentToMarkdown } from "./markdown/serialize";
export { saveBlobAndReveal } from "./fileSave";
export type { ImportResult } from "./markdown/parse";
export type { SinglePageExportFormat } from "./pageWithAttachments";
export type { ExportOptions } from "./zipBundle";

export const blocksToMarkdown = (
  ...args: Parameters<BlockNoteSerializer["blocksToMarkdown"]>
): ReturnType<BlockNoteSerializer["blocksToMarkdown"]> =>
  import("./blocknoteSerializer").then((mod) => mod.blocksToMarkdown(...args));

export const blocksToHTML = (
  ...args: Parameters<BlockNoteSerializer["blocksToHTML"]>
): ReturnType<BlockNoteSerializer["blocksToHTML"]> =>
  import("./blocknoteSerializer").then((mod) => mod.blocksToHTML(...args));

type ImportedMarkdown = Awaited<ReturnType<MarkdownParser["importFromMarkdown"]>>;
type ImportedFragment = Awaited<ReturnType<MarkdownParser["importMarkdownFragment"]>>;

export const importFromMarkdown = async (
  ...args: Parameters<MarkdownParser["importFromMarkdown"]>
): Promise<ImportedMarkdown> => {
  const { importFromMarkdown: run } = await import("./markdown/parse");
  return run(...args);
};

export const importMarkdownFragment = async (
  ...args: Parameters<MarkdownParser["importMarkdownFragment"]>
): Promise<ImportedFragment> => {
  const { importMarkdownFragment: run } = await import("./markdown/parse");
  return run(...args);
};

export const exportNotebooks = (
  ...args: Parameters<ZipBundle["exportNotebooks"]>
): ReturnType<ZipBundle["exportNotebooks"]> =>
  import("./zipBundle").then((mod) => mod.exportNotebooks(...args));

export const generateExportZip = (
  ...args: Parameters<ZipBundle["generateExportZip"]>
): ReturnType<ZipBundle["generateExportZip"]> =>
  import("./zipBundle").then((mod) => mod.generateExportZip(...args));

export const inspectNotebookImportZip = (
  ...args: Parameters<ZipBundle["inspectNotebookImportZip"]>
): ReturnType<ZipBundle["inspectNotebookImportZip"]> =>
  import("./zipBundle").then((mod) => mod.inspectNotebookImportZip(...args));

export const importNotebooksFromZip = (
  ...args: Parameters<ZipBundle["importNotebooksFromZip"]>
): ReturnType<ZipBundle["importNotebooksFromZip"]> =>
  import("./zipBundle").then((mod) => mod.importNotebooksFromZip(...args));

export const buildSinglePageExport = (
  ...args: Parameters<PageExport["buildSinglePageExport"]>
): ReturnType<PageExport["buildSinglePageExport"]> =>
  import("./pageWithAttachments").then((mod) => mod.buildSinglePageExport(...args));

export const pageHasLocalSidecarAttachments = (
  ...args: Parameters<PageExport["pageHasLocalSidecarAttachments"]>
): Promise<boolean> =>
  import("./pageWithAttachments").then((mod) => mod.pageHasLocalSidecarAttachments(...args));

export const renderExportHtml = (
  ...args: Parameters<typeof import("./exportHtmlDocument")["renderExportHtml"]>
): ReturnType<typeof import("./exportHtmlDocument")["renderExportHtml"]> =>
  import("./exportHtmlDocument").then((mod) => mod.renderExportHtml(...args));

async function exportPage(
  page: Page,
  format: SinglePageExportFormat,
  pdfBlob?: Blob,
) {
  const { blob, filename } = await buildSinglePageExport(page, format, pdfBlob);
  return saveDocumentBlobAndReveal(blob, filename);
}

export async function exportToJSON(page: Page) {
  return exportPage(page, "json");
}

export async function exportToMarkdown(page: Page) {
  return exportPage(page, "md");
}

export async function exportToHTML(page: Page) {
  return exportPage(page, "html");
}

export async function exportToPDF(page: Page, customFonts?: CustomFonts) {
  const { renderPageToPdfBlob } = await import("@/lib/pdfExport");
  const pdfBlob = await renderPageToPdfBlob(page, customFonts);
  return exportPage(page, "pdf", pdfBlob);
}


export function importFromJSON(
  jsonString: string,
  filename?: string,
): ImportResult {
  try {
    const data: unknown = JSON.parse(jsonString);
    if (!data || typeof data !== "object" || !("content" in data)) {
      return {
        title: "",
        content: createEmptyBlockNoteContent(),
        success: false,
        error: uiText("invalidJsonTheContentFieldIsMissing"),
      };
    }
    const record = data as Record<string, unknown>;
    if (!record.content || typeof record.content !== "object") {
      return {
        title: "",
        content: createEmptyBlockNoteContent(),
        success: false,
        error: uiText("invalidJsonTheContentFieldIsMissing"),
      };
    }

    let title = filename || "导入的页面";
    if (typeof record.title === "string" && record.title) {
      title = record.title;
    } else {
      title =
        extractTitleFromContent(record.content as BlockNoteContent) ||
        filename ||
        "导入的页面";
    }

    return {
      title,
      content: normalizePageContent(record.content),
      success: true,
    };
  } catch {
    return {
      title: "",
      content: createEmptyBlockNoteContent(),
      success: false,
      error: uiText("couldnTParseTheJsonFile"),
    };
  }
}

export async function importFile(options?: {
  preserveStructure?: boolean;
}): Promise<ImportResult> {
  const failed = (error: string): ImportResult => ({
    title: "",
    content: createEmptyBlockNoteContent(),
    success: false,
    error,
  });
  try {
    const file = await pickImportFile([
      { name: uiText("noteFiles"), extensions: ["json", "md", "markdown", "txt"] },
    ]);
    if (!file) return failed(uiText("noFileSelected"));
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const filename = file.name.replace(/\.[^/.]+$/, "");
    if (ext === "json") return importFromJSON(text, filename);
    if (ext === "md" || ext === "markdown" || ext === "txt") {
      return await importFromMarkdown(text, filename, {
        preserveStructure: options?.preserveStructure === true,
      });
    }
    return failed(uiText("unsupportedFileFormat"));
  } catch (error) {
    return failed(error instanceof Error && error.message
      ? uiText("readError", {error: error.message}) : uiText("couldnTReadTheFile"));
  }
}
