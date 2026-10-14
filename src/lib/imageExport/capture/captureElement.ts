import { toast } from "@/components/ui/sonner";
import { withTimeout } from "./timeout";
import { renderPngBlobWithFallback } from "./pngCapture";
import { createLoadingOverlay, removeLoadingOverlay } from "./loadingOverlay";

let isCapturingImage = false;

function getExportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return "导出图片失败，请重试";
  if (/timeout|超时/i.test(message)) return `导出图片失败：${message}`;
  if (/内容过长|尺寸超出|图片编码|保存图片/.test(message)) {
    return message;
  }
  return "导出图片失败，请重试";
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
    toast.info("图片正在生成，请稍候");
    return;
  }

  isCapturingImage = true;
  const overlay = createLoadingOverlay();

  try {
    await withTimeout(
      Promise.all([document.fonts.ready, waitForImages(element)]),
      10_000,
      "等待图片资源超时",
    );

    await new Promise((resolve) =>
      requestAnimationFrame(() => resolve(undefined)),
    );

    const blob = await renderPngBlobWithFallback(element);
    removeLoadingOverlay(overlay);

    const { saveDocumentBlobAndReveal } = await import("../../export/documentFileDialogs");
    const saved = await saveDocumentBlobAndReveal(blob, filename);
    if (saved) {
      toast.success("图片已保存");
    }
  } catch (error) {
    toast.error(getExportErrorMessage(error));
    console.error("[imageExport] capture failed:", error);
  } finally {
    isCapturingImage = false;
    removeLoadingOverlay(overlay);
  }
}
