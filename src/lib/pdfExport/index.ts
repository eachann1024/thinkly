import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/pdfExport/index.ts#localMessages:1">`
zh-Hans:
  couldnTLoadTheChineseFontRequiredToGenerate: "未能加载中文字体，无法生成 PDF"
  theGeneratedPdfIsEmpty: "react-pdf 生成了空 PDF"
  pdfExportFailed: "PDF 导出失败"
en:
  couldnTLoadTheChineseFontRequiredToGenerate: "Couldn’t load the Chinese font required to generate the PDF"
  theGeneratedPdfIsEmpty: "The generated PDF is empty"
  pdfExportFailed: "PDF export failed"
ja:
  couldnTLoadTheChineseFontRequiredToGenerate: "中国語フォントを読み込めないため、PDF を生成できません"
  theGeneratedPdfIsEmpty: "react-pdf が空の PDF を生成しました"
  pdfExportFailed: "PDF の書き出しに失敗しました"
`;
const uiText = createTranslator(localMessages);

import type { Page } from "@/types";
import type { CustomFonts } from "@/stores/useSettings";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { prepareExportBlocks } from "@/lib/export/prepareExportBlocks";
import { registerPdfFonts } from "./fontConfig";
import { createPdfBlockMappings } from "./blockMappings";
import { canPrintToPdf, exportPageViaPrintToPdf } from "./printPdf";

async function readExportCustomFonts(): Promise<CustomFonts> {
  const { useSettings } = await import("@/stores/useSettings");
  return useSettings.getState().customFonts;
}

async function exportViaReactPdf(
  page: Page,
  blocks: BlockNoteContent,
  customFonts?: CustomFonts,
): Promise<Blob> {
  const fonts = customFonts ?? (await readExportCustomFonts());
  const registered = await registerPdfFonts({
    fontFamily: page.fontFamily ?? "default",
    customFonts: fonts,
  });
  if (!registered.ready) {
    throw new Error(uiText("couldnTLoadTheChineseFontRequiredToGenerate"));
  }

  const [ReactPDF, { createPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./renderer"),
  ]);
  const blockMapping = await createPdfBlockMappings({
    pageLocalFilePath: page.localFilePath ?? null,
  });
  const document = await createPdfDocument(blocks, blockMapping, registered.pageFontFamily);
  const blob = await ReactPDF.pdf(document).toBlob();
  if (!blob || blob.size < 80) {
    throw new Error(uiText("theGeneratedPdfIsEmpty"));
  }
  return blob;
}

export async function renderPageToPdfBlob(
  page: Page,
  customFonts?: CustomFonts,
): Promise<Blob> {
  const blocks = await prepareExportBlocks(page);

  let blob: Blob | null = null;
  let lastError: unknown;

  if (canPrintToPdf()) {
    try {
      blob = await exportPageViaPrintToPdf(page, blocks);
    } catch (error) {
      lastError = error;
      console.warn("[pdfExport] printToPDF 失败，降级 react-pdf:", error);
    }
  }

  if (!blob) {
    try {
      blob = await exportViaReactPdf(page, blocks, customFonts);
    } catch (error) {
      lastError = error;
      console.error("[pdfExport] react-pdf 导出失败:", error);
    }
  }

  if (!blob) {
    throw lastError instanceof Error
      ? lastError
      : new Error(uiText("pdfExportFailed"));
  }

  return blob;
}
