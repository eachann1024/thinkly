import { useCallback } from "react";
import { toast } from "@/components/ui/sonner";
import { blobToBase64 } from "@/lib/imageStorage/utils";
import { convertImageBlobToPng } from "@/lib/imageProcessor";
import { saveBlobAndReveal } from "@/lib/export/fileSave";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { openResourceExternally } from "@/components/editor/utils/openResourceExternally";
import {
  resolveImageSrc,
  getImageElements,
  getBlockIdFromImage,
  getImageBlockIdByIndex,
  getImageSrc,
} from "./imageUtils";
import type { ImageLightboxProps, SlideInfo } from "./lightboxTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/image/useLightboxActions.ts#messages:1">`
zh-Hans:
  couldNotOpenInTheSystemImageViewer: "无法使用系统图片查看器打开"
  unknownError: "未知错误"
  imageSavedToDownloads: "图片已保存到下载文件夹"
  saveFailed: "保存失败"
  copiedToClipboard: "已复制到剪贴板"
  downloadFailed: "下载失败：{{error}}"
  copyFailed: "复制失败：{{error}}"
en:
  couldNotOpenInTheSystemImageViewer: "Could not open in the system image viewer"
  unknownError: "Unknown error"
  imageSavedToDownloads: "Image saved to Downloads"
  saveFailed: "Save failed"
  copiedToClipboard: "Copied to clipboard"
  downloadFailed: "Download failed: {{error}}"
  copyFailed: "Copy failed: {{error}}"
ja:
  couldNotOpenInTheSystemImageViewer: "システムの画像ビューアで開けませんでした"
  unknownError: "不明なエラー"
  imageSavedToDownloads: "画像をダウンロードフォルダに保存しました"
  saveFailed: "保存に失敗しました"
  copiedToClipboard: "クリップボードにコピーしました"
  downloadFailed: "ダウンロードに失敗しました：{{error}}"
  copyFailed: "コピーに失敗しました：{{error}}"
`;
const t = createTranslator(messages);


export function useLightboxActions(
  editor: ImageLightboxProps["editor"],
  editorContainerRef: ImageLightboxProps["editorContainerRef"],
  currentSlide: SlideInfo | undefined,
) {
  useLocale();
  const platform = useEditorPlatform();
  const { getActivePageLocalFilePath } = useEditorPageContext();
  const openImageInSystemViewer = useCallback(
    async (img: HTMLImageElement) => {
      const container = editorContainerRef.current;
      if (!container) return;
      const imageIndex = getImageElements(container).indexOf(img);
      const blockId =
        getBlockIdFromImage(img, container) ||
        getImageBlockIdByIndex(editor.document as any[], imageIndex);
      const block = blockId ? editor.getBlock(blockId) : null;
      const rawSource =
        (block?.props as { url?: string } | undefined)?.url || getImageSrc(img);
      const result = await openResourceExternally({
        source: rawSource,
        fileName:
          img.alt ||
          img.getAttribute("alt") ||
          (block?.props as { name?: string } | undefined)?.name ||
          "image",
        mimeType: "image/png",
        pageLocalFilePath: getActivePageLocalFilePath(),
        platform,
        loadInternalResource: (source) => platform.imageStorage.load(source),
      });
      if (result.ok) return;
      toast.error(t("couldNotOpenInTheSystemImageViewer"), {
        description: result.error || t("unknownError"),
      });
    },
    [editor, editorContainerRef, getActivePageLocalFilePath, platform],
  );
  const downloadImage = useCallback(
    async (src: string) => {
      let resolvedObjectUrl: string | null = null;
      try {
        const resolvedSrc = await resolveImageSrc(
          src,
          platform,
          getActivePageLocalFilePath(),
        );
        if (resolvedSrc.startsWith("blob:") && resolvedSrc !== src) {
          resolvedObjectUrl = resolvedSrc;
        }
        const response = await fetch(resolvedSrc);
        const sourceBlob = await response.blob();
        // 存储多为 WebP；下载统一转 PNG，兼容更多工具
        const blob = await convertImageBlobToPng(sourceBlob);
        const filename = `image-${Date.now()}.png`;
        const saved = await saveBlobAndReveal(blob, filename);
        if (saved) {
          toast.success(t("imageSavedToDownloads"));
          return;
        }
        toast.error(t("saveFailed"));
      } catch (err) {
        toast.error(
          t("downloadFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
        );
      } finally {
        if (resolvedObjectUrl) {
          try {
            URL.revokeObjectURL(resolvedObjectUrl);
          } catch {
            /* ignore */
          }
        }
      }
    },
    [platform, getActivePageLocalFilePath],
  );

  const handleDownload = useCallback(async () => {
    if (!currentSlide) return;
    await downloadImage(currentSlide.src);
  }, [currentSlide, downloadImage]);

  const copyImageToClipboard = useCallback(
    async (src: string) => {
      let resolvedObjectUrl: string | null = null;
      try {
        const resolvedSrc = await resolveImageSrc(
          src,
          platform,
          getActivePageLocalFilePath(),
        );
        if (resolvedSrc.startsWith("blob:") && resolvedSrc !== src) {
          resolvedObjectUrl = resolvedSrc;
        }
        const response = await fetch(resolvedSrc);
        const sourceBlob = await response.blob();
        // 剪贴板统一 PNG，避免 WebP 在部分 App 粘贴失败
        const blob = await convertImageBlobToPng(sourceBlob);
        const base64 = await blobToBase64(blob);
        await platform.clipboard.copyImage(base64);
        toast.success(t("copiedToClipboard"));
      } catch (err) {
        toast.error(
          t("copyFailed", { error: err instanceof Error ? err.message : t("unknownError") }),
        );
      } finally {
        if (resolvedObjectUrl) {
          try {
            URL.revokeObjectURL(resolvedObjectUrl);
          } catch {
            /* ignore */
          }
        }
      }
    },
    [platform, getActivePageLocalFilePath],
  );

  const handleCopy = useCallback(async () => {
    if (!currentSlide) return;
    await copyImageToClipboard(currentSlide.src);
  }, [copyImageToClipboard, currentSlide]);

  return {
    openImageInSystemViewer,
    downloadImage,
    copyImageToClipboard,
    handleDownload,
    handleCopy,
  };
}
