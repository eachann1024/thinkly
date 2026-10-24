import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/contentPixelRatio.ts#localMessages:1">`
zh-Hans:
  theContentIsTooLargeToExportAsOne: "内容过大，无法导出为单张图片，请缩小范围后重试"
en:
  theContentIsTooLargeToExportAsOne: "The content is too large to export as one image. Select a smaller range and try again."
ja:
  theContentIsTooLargeToExportAsOne: "内容が大きすぎて 1 枚の画像として書き出せません。範囲を狭めてからやり直してください"
`;
const uiText = createTranslator(localMessages);
export const EXPORT_TARGET_LONG_EDGE = 3840;
export const EXPORT_MIN_PIXEL_RATIO = 2;
export const EXPORT_MAX_PIXEL_RATIO = 8;

const MAX_CAPTURE_EDGE = 16_384;
const MAX_CAPTURE_PIXELS = 16_000_000;
const MIN_CAPTURE_PIXEL_RATIO = 0.1;

export type ContentAwarePixelRatioOptions = {
  targetLongEdge?: number;
  minRatio?: number;
  maxRatio?: number;
};

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

export function calculateContentAwarePixelRatio(
  width: number,
  height: number,
  options?: ContentAwarePixelRatioOptions,
): number {
  const safeWidth = Math.max(1, Math.ceil(width));
  const safeHeight = Math.max(1, Math.ceil(height));
  const longEdge = Math.max(safeWidth, safeHeight);
  const targetLongEdge = options?.targetLongEdge ?? EXPORT_TARGET_LONG_EDGE;
  const minRatio = options?.minRatio ?? EXPORT_MIN_PIXEL_RATIO;
  const maxRatio = options?.maxRatio ?? EXPORT_MAX_PIXEL_RATIO;

  const edgeRatio = Math.min(
    MAX_CAPTURE_EDGE / safeWidth,
    MAX_CAPTURE_EDGE / safeHeight,
  );
  const areaRatio = Math.sqrt(MAX_CAPTURE_PIXELS / (safeWidth * safeHeight));
  const contentRatio = targetLongEdge / longEdge;
  let ratio = Math.min(maxRatio, edgeRatio, areaRatio, Math.max(minRatio, contentRatio));

  if (longEdge >= targetLongEdge) {
    ratio = Math.min(maxRatio, edgeRatio, areaRatio, Math.max(1, minRatio));
  }

  ratio = Math.floor(ratio * 10_000) / 10_000;

  while (
    ratio >= MIN_CAPTURE_PIXEL_RATIO &&
    !isCaptureRatioWithinLimits(safeWidth, safeHeight, ratio)
  ) {
    ratio = Math.floor((ratio - 0.0001) * 10_000) / 10_000;
  }

  if (!isCaptureRatioWithinLimits(safeWidth, safeHeight, ratio)) {
    throw new Error(uiText("theContentIsTooLargeToExportAsOne"));
  }
  return ratio;
}

export function getContentAwarePixelRatios(
  width: number,
  height: number,
  options?: ContentAwarePixelRatioOptions,
): number[] {
  const primary = calculateContentAwarePixelRatio(width, height, options);
  const roundDown = (ratio: number) => Math.floor(ratio * 10_000) / 10_000;
  const candidates =
    primary > 4
      ? [primary, 4, 2, 1]
      : primary > 2
        ? [primary, 2, 1]
        : primary > 1
          ? [primary, 1]
          : [
              primary,
              Math.max(MIN_CAPTURE_PIXEL_RATIO, roundDown(primary * 0.75)),
              Math.max(MIN_CAPTURE_PIXEL_RATIO, roundDown(primary * 0.5)),
            ];

  return candidates.filter(
    (ratio, index) =>
      ratio >= MIN_CAPTURE_PIXEL_RATIO &&
      isCaptureRatioWithinLimits(width, height, ratio) &&
      candidates.findIndex((candidate) => candidate === ratio) === index,
  );
}
