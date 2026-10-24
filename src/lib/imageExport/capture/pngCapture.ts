import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/capture/pngCapture.ts#localMessages:1">`
zh-Hans:
  loadFailed: "图片加载失败"
  imageEncodingFailed: "图片编码失败"
  imageGenerationTimedOut: "生成图片超时"
  imageEncodingTimedOut: "图片编码超时"
  couldnTGenerateTheImage: "生成图片失败"
en:
  loadFailed: "Image couldn’t load"
  imageEncodingFailed: "Image encoding failed"
  imageGenerationTimedOut: "Image generation timed out"
  imageEncodingTimedOut: "Image encoding timed out"
  couldnTGenerateTheImage: "Couldn’t generate the image"
ja:
  loadFailed: "画像を読み込めませんでした"
  imageEncodingFailed: "画像のエンコードに失敗しました"
  imageGenerationTimedOut: "画像の生成がタイムアウトしました"
  imageEncodingTimedOut: "画像のエンコードがタイムアウトしました"
  couldnTGenerateTheImage: "画像を生成できませんでした"
`;
const uiText = createTranslator(localMessages);
import { toCanvas } from "html-to-image";
import { TEXT_COLORS } from "@/lib/textColors";
import { getElementCapturePixelRatios } from "./pixelRatio";
import { withTimeout } from "./timeout";

const CAPTURE_TIMEOUT_MS = 60_000;

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(uiText("imageEncodingFailed")));
        }
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

function releaseCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  canvas.width = 1;
  canvas.height = 1;
}

async function yieldForCanvasCleanup(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function renderPngBlobWithFallback(element: HTMLElement): Promise<Blob> {
  const pixelRatios = getElementCapturePixelRatios(element);
  let lastError: unknown;

  for (let index = 0; index < pixelRatios.length; index += 1) {
    const pixelRatio = pixelRatios[index];
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await withTimeout(
        toCanvas(element, {
          pixelRatio,
          cacheBust: false,
          skipFonts: true,
          imagePlaceholder:
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">' +
                '<rect width="200" height="80" rx="6" fill="#f3f4f6"/>' +
                `<text x="100" y="44" font-family="sans-serif" font-size="13" fill="${TEXT_COLORS.light.secondary}" text-anchor="middle">${uiText("loadFailed")}</text>` +
                "</svg>",
            ),
        }),
        CAPTURE_TIMEOUT_MS,
        uiText("imageGenerationTimedOut"),
      );

      return await withTimeout(
        canvasToPngBlob(canvas),
        CAPTURE_TIMEOUT_MS,
        uiText("imageEncodingTimedOut"),
      );
    } catch (error) {
      lastError = error;
      releaseCanvas(canvas);
      canvas = null;
      const hasFallback = index < pixelRatios.length - 1;
      const timedOut =
        error instanceof Error && /timeout|超时/i.test(error.message);
      if (!hasFallback || timedOut) break;
      console.warn(
        `[imageExport] ${pixelRatio}x capture failed, retrying at ${pixelRatios[index + 1]}x:`,
        error,
      );
      await yieldForCanvasCleanup();
    } finally {
      releaseCanvas(canvas);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(uiText("couldnTGenerateTheImage"));
}
