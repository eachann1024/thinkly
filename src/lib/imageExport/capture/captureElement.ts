import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/capture/captureElement.ts#localMessages:1">`
zh-Hans:
  couldnTExportTheImageTryAgain: "导出图片失败，请重试"
  exportFailed: "导出图片失败：{{error}}"
  generatingImagePleaseWait: "图片正在生成，请稍候"
  timedOutWaitingForImagesToLoad: "等待图片资源超时"
  imageSaved: "图片已保存"
en:
  couldnTExportTheImageTryAgain: "Couldn’t export the image. Try again."
  exportFailed: "Couldn’t export the image: {{error}}"
  generatingImagePleaseWait: "Generating image. Please wait."
  timedOutWaitingForImagesToLoad: "Timed out waiting for images to load"
  imageSaved: "Image saved"
ja:
  couldnTExportTheImageTryAgain: "画像を書き出せませんでした。もう一度お試しください"
  exportFailed: "画像を書き出せませんでした: {{error}}"
  generatingImagePleaseWait: "画像を生成しています。しばらくお待ちください"
  timedOutWaitingForImagesToLoad: "画像の読み込み待ちがタイムアウトしました"
  imageSaved: "画像を保存しました"
`;
const uiText = createTranslator(localMessages);
import { toast } from "@/components/ui/sonner";
import { withTimeout } from "./timeout";
import { renderPngBlobWithFallback } from "./pngCapture";
import { createLoadingOverlay, removeLoadingOverlay } from "./loadingOverlay";

let isCapturingImage = false;

function getExportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return uiText("couldnTExportTheImageTryAgain");
  if (/timeout|timed out|超时/i.test(message)) return uiText("exportFailed", {error: message});
  if (/内容过长|尺寸超出|图片编码|保存图片|content is too (?:long|large)|image encoding|save the image/i.test(message)) {
    return message;
  }
  return uiText("couldnTExportTheImageTryAgain");
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll("img");
  if (images.length === 0) return Promise.resolve();

  const promises = Array.from(images).map((img) => {
    return new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(() => resolve(), 3000);
    });
  });

  return Promise.all(promises).then(() => {});
}

export async function captureElementToPng(element: HTMLElement, filename: string) {
  if (isCapturingImage) {
    toast.info(uiText("generatingImagePleaseWait"));
    return;
  }

  isCapturingImage = true;
  const overlay = createLoadingOverlay();

  try {
    await withTimeout(
      Promise.all([document.fonts.ready, waitForImages(element)]),
      10_000,
      uiText("timedOutWaitingForImagesToLoad"),
    );

    await new Promise((resolve) =>
      requestAnimationFrame(() => resolve(undefined)),
    );

    const blob = await renderPngBlobWithFallback(element);
    removeLoadingOverlay(overlay);

    const { saveDocumentBlobAndReveal } = await import("../../export/documentFileDialogs");
    const saved = await saveDocumentBlobAndReveal(blob, filename);
    if (saved) {
      toast.success(uiText("imageSaved"));
    }
  } catch (error) {
    toast.error(getExportErrorMessage(error));
    console.error("[imageExport] capture failed:", error);
  } finally {
    isCapturingImage = false;
    removeLoadingOverlay(overlay);
  }
}
