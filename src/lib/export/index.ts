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
        error: "无效的 JSON 格式：缺少 content 字段",
      };
    }
    const record = data as Record<string, unknown>;
    if (!record.content || typeof record.content !== "object") {
      return {
        title: "",
        content: createEmptyBlockNoteContent(),
        success: false,
        error: "无效的 JSON 格式：缺少 content 字段",
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
      error: "解析 JSON 失败",
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
      { name: "笔记文件", extensions: ["json", "md", "markdown", "txt"] },
    ]);
    if (!file) return failed("未选择文件");
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const filename = file.name.replace(/\.[^/.]+$/, "");
    if (ext === "json") return importFromJSON(text, filename);
    if (ext === "md" || ext === "markdown" || ext === "txt") {
      return importFromMarkdown(text, filename, {
        preserveStructure: options?.preserveStructure === true,
      });
    }
    return failed("不支持的文件格式");
  } catch (error) {
    return failed(error instanceof Error && error.message
      ? `读取文件失败：${error.message}` : "读取文件失败");
  }
}
