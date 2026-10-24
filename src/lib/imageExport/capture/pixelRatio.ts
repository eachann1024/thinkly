import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/capture/pixelRatio.ts#localMessages:1">`
zh-Hans:
  theContentIsTooLongToExportAsOne: "内容过长，无法导出为单张图片，请缩小内容范围后重试"
en:
  theContentIsTooLongToExportAsOne: "The content is too long to export as one image. Select a smaller range and try again."
ja:
  theContentIsTooLongToExportAsOne: "内容が長すぎて 1 枚の画像として書き出せません。範囲を狭めてからやり直してください"
`;
const uiText = createTranslator(localMessages);
const MAX_CAPTURE_PIXEL_RATIO = 3;
const MIN_CAPTURE_PIXEL_RATIO = 0.1;
const MAX_CAPTURE_EDGE = 16_384;
const MAX_CAPTURE_PIXELS = 16_000_000;

function isCaptureRatioWithinLimits(
  width: number,
  height: number,
  ratio: number,
): boolean {
  if (ratio < MIN_CAPTURE_PIXEL_RATIO) return false;
  const outputWidth = Math.ceil(width * ratio);
  const outputHeight = Math.ceil(height * ratio);
  return (
    outputWidth <= MAX_CAPTURE_EDGE &&
    outputHeight <= MAX_CAPTURE_EDGE &&
    outputWidth * outputHeight <= MAX_CAPTURE_PIXELS
  );
}

export function calculateSafePixelRatio(width: number, height: number): number {
  const safeWidth = Math.max(1, Math.ceil(width));
  const safeHeight = Math.max(1, Math.ceil(height));
  const edgeRatio = Math.min(
    MAX_CAPTURE_EDGE / safeWidth,
    MAX_CAPTURE_EDGE / safeHeight,
  );
  const areaRatio = Math.sqrt(MAX_CAPTURE_PIXELS / (safeWidth * safeHeight));
  let ratio = Math.min(MAX_CAPTURE_PIXEL_RATIO, edgeRatio, areaRatio);

  ratio = Math.floor(ratio * 10_000) / 10_000;

  while (
    ratio >= MIN_CAPTURE_PIXEL_RATIO &&
    !isCaptureRatioWithinLimits(safeWidth, safeHeight, ratio)
  ) {
    ratio = Math.floor((ratio - 0.0001) * 10_000) / 10_000;
  }

  if (!isCaptureRatioWithinLimits(safeWidth, safeHeight, ratio)) {
    throw new Error(uiText("theContentIsTooLongToExportAsOne"));
  }
  return ratio;
}

export function getCapturePixelRatios(width: number, height: number): number[] {
  const primaryRatio = calculateSafePixelRatio(width, height);
  const roundDown = (ratio: number) => Math.floor(ratio * 10_000) / 10_000;
  const candidates =
    primaryRatio > 2
      ? [primaryRatio, 2, 1]
      : primaryRatio > 1
        ? [primaryRatio, 1]
        : [
            primaryRatio,
            Math.max(MIN_CAPTURE_PIXEL_RATIO, roundDown(primaryRatio * 0.75)),
            Math.max(MIN_CAPTURE_PIXEL_RATIO, roundDown(primaryRatio * 0.5)),
          ];

  return candidates.filter(
    (ratio, index) =>
      ratio >= MIN_CAPTURE_PIXEL_RATIO &&
      candidates.findIndex((candidate) => candidate === ratio) === index,
  );
}

export function getElementCapturePixelRatios(element: HTMLElement): number[] {
  const rect = element.getBoundingClientRect();
  const width = element.scrollWidth || rect.width;
  const height = element.scrollHeight || rect.height;
  return getCapturePixelRatios(width, height);
}
