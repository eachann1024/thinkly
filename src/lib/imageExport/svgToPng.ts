import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/svgToPng.ts#localMessages:1">`
zh-Hans:
  couldnTReadTheImageData: "图片数据读取失败"
  theImageIsEmpty: "图片为空"
  couldnTGenerateTheImage: "生成图片失败"
  imageExportIsnTSupportedInThisEnvironment: "当前环境不支持导出图片"
  theSvgIsEmpty: "SVG 为空"
  readFailed: "图片读取失败（{{status}}）"
en:
  couldnTReadTheImageData: "Couldn’t read the image data"
  theImageIsEmpty: "The image is empty"
  couldnTGenerateTheImage: "Couldn’t generate the image"
  imageExportIsnTSupportedInThisEnvironment: "Image export isn’t supported in this environment"
  theSvgIsEmpty: "The SVG is empty"
  readFailed: "Couldn’t load the image ({{status}})"
ja:
  couldnTReadTheImageData: "画像データを読み込めませんでした"
  theImageIsEmpty: "画像が空です"
  couldnTGenerateTheImage: "画像を生成できませんでした"
  imageExportIsnTSupportedInThisEnvironment: "この環境では画像の書き出しに対応していません"
  theSvgIsEmpty: "SVG が空です"
  readFailed: "画像を読み込めませんでした（{{status}}）"
`;
const uiText = createTranslator(localMessages);

import { getContentAwarePixelRatios } from "./contentPixelRatio";
export { EXPORT_TARGET_LONG_EDGE, EXPORT_MIN_PIXEL_RATIO, EXPORT_MAX_PIXEL_RATIO, calculateContentAwarePixelRatio, getContentAwarePixelRatios } from "./contentPixelRatio";
export type { ContentAwarePixelRatioOptions } from "./contentPixelRatio";

function parseSvgLength(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.endsWith("%")) return null;
  const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:px|pt|pc|in|cm|mm|em|rem|ex|ch)?$/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function ensureSvgContentSize(svgEl: SVGSVGElement): {
  width: number;
  height: number;
} {
  let width = parseSvgLength(svgEl.getAttribute("width"));
  let height = parseSvgLength(svgEl.getAttribute("height"));

  const viewBox = svgEl.viewBox?.baseVal;
  if (
    (width == null || height == null) &&
    viewBox &&
    viewBox.width > 0 &&
    viewBox.height > 0
  ) {
    width = width ?? viewBox.width;
    height = height ?? viewBox.height;
  }

  if (width == null || height == null) {
    try {
      const bbox = svgEl.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        width = width ?? bbox.width;
        height = height ?? bbox.height;
      }
    } catch {
    }
  }

  if (width == null || height == null) {
    const rect = svgEl.getBoundingClientRect();
    width = width ?? (rect.width > 0 ? rect.width : 300);
    height = height ?? (rect.height > 0 ? rect.height : 150);
  }

  const safeWidth = Math.max(1, Math.ceil(width));
  const safeHeight = Math.max(1, Math.ceil(height));

  svgEl.setAttribute("width", String(safeWidth));
  svgEl.setAttribute("height", String(safeHeight));
  svgEl.style.width = `${safeWidth}px`;
  svgEl.style.height = `${safeHeight}px`;
  svgEl.style.maxWidth = "none";
  svgEl.style.maxHeight = "none";
  svgEl.style.overflow = "visible";

  return { width: safeWidth, height: safeHeight };
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(uiText("couldnTReadTheImageData"));
    const blob = await response.blob();
    if (!blob.size) throw new Error(uiText("theImageIsEmpty"));
    return blob;
  });
}

async function toPngWithRatioFallback(
  element: HTMLElement,
  width: number,
  height: number,
  options?: {
    pixelRatio?: number;
    backgroundColor?: string;
    ratios?: number[];
  },
): Promise<string> {
  const { toPng } = await import("html-to-image");
  const ratios =
    options?.ratios ??
    (options?.pixelRatio != null
      ? [options.pixelRatio]
      : getContentAwarePixelRatios(width, height));

  let lastError: unknown;
  for (let index = 0; index < ratios.length; index += 1) {
    const pixelRatio = ratios[index];
    try {
      return await toPng(element, {
        pixelRatio,
        cacheBust: true,
        backgroundColor: options?.backgroundColor ?? "transparent",
        skipFonts: true,
        width,
        height,
      });
    } catch (error) {
      lastError = error;
      if (index >= ratios.length - 1) break;
      console.warn(
        `[imageExport] ${pixelRatio}x capture failed, retrying at ${ratios[index + 1]}x:`,
        error,
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error(uiText("couldnTGenerateTheImage"));
}

export async function svgMarkupToPngBlob(
  svg: string,
  options?: {
    pixelRatio?: number;
    padding?: number;
    targetLongEdge?: number;
    backgroundColor?: string;
  },
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error(uiText("imageExportIsnTSupportedInThisEnvironment"));
  }
  const markup = svg.trim();
  if (!markup) throw new Error(uiText("theSvgIsEmpty"));

  const padding = options?.padding ?? 12;
  const backgroundColor = options?.backgroundColor ?? "transparent";

  const host = document.createElement("div");
  host.setAttribute("data-goose-svg-export", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    "z-index:-1",
    "display:inline-block",
    `padding:${padding}px`,
    `background:${backgroundColor}`,
    "line-height:0",
    "pointer-events:none",
    "font-family:Inter,'PingFang SC','Hiragino Sans GB','Noto Sans SC',sans-serif",
  ].join(";");
  host.innerHTML = markup;

  const svgEl = host.querySelector("svg");
  let contentWidth = 300;
  let contentHeight = 150;
  if (svgEl instanceof SVGSVGElement) {
    const size = ensureSvgContentSize(svgEl);
    contentWidth = size.width;
    contentHeight = size.height;
  }

  const exportWidth = contentWidth + padding * 2;
  const exportHeight = contentHeight + padding * 2;
  host.style.width = `${exportWidth}px`;
  host.style.height = `${exportHeight}px`;
  host.style.boxSizing = "border-box";

  document.body.appendChild(host);
  try {
    await document.fonts.ready.catch(() => undefined);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const dataUrl = await toPngWithRatioFallback(
      host,
      exportWidth,
      exportHeight,
      {
        pixelRatio: options?.pixelRatio,
        backgroundColor,
        ratios:
          options?.pixelRatio != null
            ? undefined
            : getContentAwarePixelRatios(exportWidth, exportHeight, {
                targetLongEdge: options?.targetLongEdge,
              }),
      },
    );
    return dataUrlToBlob(dataUrl);
  } finally {
    document.body.removeChild(host);
  }
}

export async function captureElementAsPngBlob(
  element: HTMLElement,
  options?: {
    pixelRatio?: number;
    backgroundColor?: string;
    targetLongEdge?: number;
  },
): Promise<Blob> {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(element.scrollWidth || rect.width || 1));
  const height = Math.max(
    1,
    Math.ceil(element.scrollHeight || rect.height || 1),
  );

  const dataUrl = await toPngWithRatioFallback(element, width, height, {
    pixelRatio: options?.pixelRatio,
    backgroundColor: options?.backgroundColor ?? "transparent",
    ratios:
      options?.pixelRatio != null
        ? undefined
        : getContentAwarePixelRatios(width, height, {
            targetLongEdge: options?.targetLongEdge,
          }),
  });
  return dataUrlToBlob(dataUrl);
}

export async function imageUrlToPngBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(uiText("readFailed", {status: response.status}));
  const blob = await response.blob();
  if (!blob.size) throw new Error(uiText("theImageIsEmpty"));
  if (blob.type === "image/png" || blob.type === "") {
    if (blob.type === "image/png") return blob;
  }
  return blob;
}
