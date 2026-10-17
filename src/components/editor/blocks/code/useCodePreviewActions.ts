import { useCallback } from "react";
import { TEXT_COLORS } from "@/lib/textColors";
import { renderMermaidSvgForExport } from "@/lib/imageExport/mermaid";
import {
  captureElementAsPngBlob,
  svgMarkupToPngBlob,
} from "@/lib/imageExport/svgToPng";
import { blobToBase64, convertImageBlobToPng } from "@/lib/imageProcessor";
import { toast } from "@/components/ui/sonner";
import { openPreviewInSystem } from "@/lib/preview/previewAction";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/code/useCodePreviewActions.ts#messages:1">`
zh-Hans:
  nothingToExport: "无可导出内容"
  thisTypeDoesNotSupportExportingImages: "当前类型不支持导出图片"
  imageSavedToDownloads: "图片已保存到下载文件夹"
  saveFailed: "保存失败"
  savedToDownloads: "已保存到下载文件夹"
  unknownError: "未知错误"
  copiedToClipboard: "已复制到剪贴板"
  nothingToPreview: "无可预览内容"
  thisCodeBlockDoesNotSupportSystemPreview: "当前代码块不支持系统预览"
  downloadFailed: "下载失败：{{error}}"
  copyFailed: "复制失败：{{error}}"
  systemPreviewFailed: "系统预览失败：{{error}}"
en:
  nothingToExport: "Nothing to export"
  thisTypeDoesNotSupportExportingImages: "This type does not support exporting images"
  imageSavedToDownloads: "Image saved to Downloads"
  saveFailed: "Save failed"
  savedToDownloads: "Saved to Downloads"
  unknownError: "Unknown error"
  copiedToClipboard: "Copied to clipboard"
  nothingToPreview: "Nothing to preview"
  thisCodeBlockDoesNotSupportSystemPreview: "This code block does not support system preview"
  downloadFailed: "Download failed: {{error}}"
  copyFailed: "Copy failed: {{error}}"
  systemPreviewFailed: "System preview failed: {{error}}"
ja:
  nothingToExport: "書き出す内容がありません"
  thisTypeDoesNotSupportExportingImages: "この種類は画像の書き出しに対応していません"
  imageSavedToDownloads: "画像をダウンロードフォルダに保存しました"
  saveFailed: "保存に失敗しました"
  savedToDownloads: "ダウンロードフォルダに保存しました"
  unknownError: "不明なエラー"
  copiedToClipboard: "クリップボードにコピーしました"
  nothingToPreview: "プレビューする内容がありません"
  thisCodeBlockDoesNotSupportSystemPreview: "このコードブロックはシステムプレビューに対応していません"
  downloadFailed: "ダウンロードに失敗しました：{{error}}"
  copyFailed: "コピーに失敗しました：{{error}}"
  systemPreviewFailed: "システムプレビューに失敗しました：{{error}}"
`;
const t = createTranslator(messages);


export function isDarkTheme(theme: string | undefined): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function useCodePreviewActions({
  getCodeContent,
  language,
  theme,
  previewRef,
}: {
  getCodeContent: () => string;
  language: string;
  theme: string | undefined;
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  useLocale();
  const platform = useEditorPlatform();
  const resolvePreviewPngBlob = useCallback(async (): Promise<Blob> => {
    const text = getCodeContent().trim();
    if (!text || typeof document === "undefined") {
      throw new Error(t("nothingToExport"));
    }

    if (language === "mermaid") {
      const svg = await renderMermaidSvgForExport(
        text,
        isDarkTheme(theme) ? "dark" : "light",
      );
      return svgMarkupToPngBlob(svg);
    }

    if (language === "math") {
      if (previewRef.current) {
        try {
          const captured = await captureElementAsPngBlob(previewRef.current);
          return convertImageBlobToPng(captured);
        } catch {
          // 预览节点截图失败时走离屏渲染
        }
      }

      const { default: katex } = await import("katex");
      const wrapper = document.createElement("div");
      wrapper.style.cssText = [
        "position:fixed",
        "left:-99999px",
        "top:0",
        "z-index:-1",
        "padding:16px 24px",
        `color:${TEXT_COLORS[isDarkTheme(theme) ? "dark" : "light"].primary}`,
        "background:transparent",
        "font-size:18px",
        "line-height:1.4",
        "display:inline-block",
      ].join(";");
      katex.render(text, wrapper, {
        displayMode: true,
        throwOnError: false,
      });
      document.body.appendChild(wrapper);
      try {
        const blob = await captureElementAsPngBlob(wrapper);
        return convertImageBlobToPng(blob);
      } finally {
        document.body.removeChild(wrapper);
      }
    }

    throw new Error(t("thisTypeDoesNotSupportExportingImages"));
  }, [getCodeContent, language, theme]);

  const handleDownloadPreview = useCallback(async () => {
    const text = getCodeContent().trim();
    if (!text || typeof document === "undefined") return;

    try {
      if (language === "mermaid" || language === "math") {
        const pngBlob = await resolvePreviewPngBlob();
        const filename =
          language === "math"
            ? `formula-${Date.now()}.png`
            : `mermaid-${Date.now()}.png`;
        const saved = await saveBlobAndReveal(pngBlob, filename);
        if (saved) toast.success(t("imageSavedToDownloads"));
        else toast.error(t("saveFailed"));
        return;
      }

      const saved = await saveBlobAndReveal(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        "code.txt",
      );
      if (saved) toast.success(t("savedToDownloads"));
      else toast.error(t("saveFailed"));
    } catch (err) {
      toast.error(
        t("downloadFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
      );
    }
  }, [getCodeContent, language, resolvePreviewPngBlob]);

  const handleCopyPreview = useCallback(async () => {
    try {
      const pngBlob = await resolvePreviewPngBlob();
      const dataUrl = await blobToBase64(pngBlob);
      await platform.clipboard.copyImage(dataUrl);
      toast.success(t("copiedToClipboard"));
    } catch (err) {
      toast.error(
        t("copyFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
      );
      throw err;
    }
  }, [platform, resolvePreviewPngBlob]);

  const handleSystemPreview = useCallback(async () => {
    try {
      const text = getCodeContent().trim();
      if (!text) throw new Error(t("nothingToPreview"));

      if (language === "mermaid") {
        const svg = await renderMermaidSvgForExport(
          text,
          isDarkTheme(theme) ? "dark" : "light",
        );
        await openPreviewInSystem({
          kind: "svg",
          markup: svg,
          fileName: "mermaid.svg",
          background: isDarkTheme(theme) ? "#1F1E1C" : "#ffffff",
        });
        return;
      }

      if (language === "math") {
        await openPreviewInSystem({
          kind: "math",
          source: text,
          fileName: "formula.html",
        });
        return;
      }

      throw new Error(t("thisCodeBlockDoesNotSupportSystemPreview"));
    } catch (err) {
      toast.error(
        t("systemPreviewFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
      );
    }
  }, [getCodeContent, language, theme]);

  return { handleDownloadPreview, handleCopyPreview, handleSystemPreview };
}
