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
  normalizePageContent,
  createEmptyBlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { importFromMarkdown, type ImportResult } from "./markdown/parse";
import { pickImportFile, saveDocumentBlobAndReveal } from "./documentFileDialogs";
import {
  buildSinglePageExport,
  type SinglePageExportFormat,
} from "./pageWithAttachments";

export { jsonContentToMarkdown } from "./markdown/serialize";
export { blocksToMarkdown, blocksToHTML } from "./blocknoteSerializer";
export {
  importFromMarkdown,
  importMarkdownFragment,
  type ImportResult,
} from "./markdown/parse";
export {
  exportNotebooks,
  generateExportZip,
  inspectNotebookImportZip,
  importNotebooksFromZip,
  type ExportOptions,
} from "./zipBundle";
export { saveBlobAndReveal } from "./fileSave";
export {
  buildSinglePageExport,
  pageHasLocalSidecarAttachments,
} from "./pageWithAttachments";
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

export { renderExportHtml } from "./exportHtmlDocument";

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
      return importFromMarkdown(text, filename, {
        preserveStructure: options?.preserveStructure === true,
      });
    }
    return failed(uiText("unsupportedFileFormat"));
  } catch (error) {
    return failed(error instanceof Error && error.message
      ? uiText("readError", {error: error.message}) : uiText("couldnTReadTheFile"));
  }
}
