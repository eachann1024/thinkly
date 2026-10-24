import { formatDecimal } from "@/i18n/format";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageProcessor.ts#localMessages:1">`
zh-Hans:
  imageDecodeFailed: "图片解码失败（{{type}}，{{size}}MB），请确认不是损坏文件"
  imageTooLarge: "图片过大（约 {{size}}MB），超过 {{limit}}MB 上限"
  compressedImageTooLarge: "图片过大（约 {{size}}MB），压缩后仍超过 {{limit}}MB 上限"
  imageDecodingIsUnavailableCreateimagebitmapIsMissing: "当前环境不支持图片解码（缺少 createImageBitmap）"
  couldnTCreateACanvasToProcessTheImage: "无法创建画布，图片处理失败"
  webpEncodingFailed: "WebP 编码失败"
  couldnTCreateACanvasToConvertTheImage: "无法创建画布，PNG 转换失败"
  couldnTConvertTheImageToPng: "转换为 PNG 失败"
en:
  imageDecodeFailed: "Couldn’t decode the image ({{type}}, {{size}} MB). Check that the file isn’t damaged."
  imageTooLarge: "The image (about {{size}} MB) exceeds the {{limit}} MB limit"
  compressedImageTooLarge: "The compressed image (about {{size}} MB) still exceeds the {{limit}} MB limit"
  imageDecodingIsUnavailableCreateimagebitmapIsMissing: "Image decoding is unavailable (createImageBitmap is missing)"
  couldnTCreateACanvasToProcessTheImage: "Couldn’t create a canvas to process the image"
  webpEncodingFailed: "WebP encoding failed"
  couldnTCreateACanvasToConvertTheImage: "Couldn’t create a canvas to convert the image to PNG"
  couldnTConvertTheImageToPng: "Couldn’t convert the image to PNG"
ja:
  imageDecodeFailed: "画像をデコードできませんでした（{{type}}、{{size}}MB）。ファイルが破損していないか確認してください"
  imageTooLarge: "画像が大きすぎます（約 {{size}}MB）。上限の {{limit}}MB を超えています"
  compressedImageTooLarge: "画像が大きすぎます（約 {{size}}MB）。圧縮後も上限の {{limit}}MB を超えています"
  imageDecodingIsUnavailableCreateimagebitmapIsMissing: "この環境では画像のデコードに対応していません（createImageBitmap がありません）"
  couldnTCreateACanvasToProcessTheImage: "キャンバスを作成できず、画像を処理できませんでした"
  webpEncodingFailed: "WebP のエンコードに失敗しました"
  couldnTCreateACanvasToConvertTheImage: "キャンバスを作成できず、PNG に変換できませんでした"
  couldnTConvertTheImageToPng: "PNG に変換できませんでした"
`;
const uiText = createTranslator(localMessages);

import type { StorageConfig } from "./imageStorage/types";
import {
  DEFAULT_STORAGE_CONFIG,
  MAX_IMAGE_STORE_BYTES,
} from "./imageStorage/types";

import {
  WEBP_MIME,
  PNG_MIME,
  SVG_MIME,
  materializeImageBlob,
} from "./imageMaterialization";
export { materializeImageBlob } from "./imageMaterialization";

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof quality === "number") {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), mimeType);
  });
}

function resolveTargetSize(
  origW: number,
  origH: number,
  maxEdge: number,
): { width: number; height: number } {
  if (Math.max(origW, origH) <= maxEdge) {
    return { width: origW, height: origH };
  }

  if (origW >= origH) {
    return {
      width: maxEdge,
      height: Math.max(1, Math.round((origH / origW) * maxEdge)),
    };
  }

  return {
    width: Math.max(1, Math.round((origW / origH) * maxEdge)),
    height: maxEdge,
  };
}

async function decodeBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") {
    throw new Error(uiText("imageDecodingIsUnavailableCreateimagebitmapIsMissing"));
  }

  try {
    return await createImageBitmap(blob);
  } catch {
    throw new Error(
      uiText("imageDecodeFailed", {type: blob.type || 'unknown', size: formatDecimal(blob.size / (1024 * 1024), 1)}),
    );
  }
}

async function encodeWebp(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const size = resolveTargetSize(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error(uiText("couldnTCreateACanvasToProcessTheImage"));
  }

  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const encoded = await canvasToBlob(canvas, WEBP_MIME, quality);
  if (!encoded || encoded.size === 0) {
    throw new Error(uiText("webpEncodingFailed"));
  }
  return encoded;
}

export async function compressIfNeeded(
  input: Blob | File,
  cfg: StorageConfig = DEFAULT_STORAGE_CONFIG,
): Promise<Blob> {
  const source =
    input.type === SVG_MIME ? input : await materializeImageBlob(input);

  if (source.type === SVG_MIME) {
    return source;
  }

  if (source.type === WEBP_MIME) {
    if (source.size > MAX_IMAGE_STORE_BYTES) {
      throw new Error(
        uiText("imageTooLarge", {size: formatDecimal(source.size / (1024 * 1024), 1), limit: Math.floor(MAX_IMAGE_STORE_BYTES / (1024 * 1024))}),
      );
    }
    return source;
  }

  const maxEdge = cfg.maxEdge ?? DEFAULT_STORAGE_CONFIG.maxEdge;
  const quality = cfg.compressQuality ?? DEFAULT_STORAGE_CONFIG.compressQuality;
  const bitmap = await decodeBitmap(source);
  const encoded = await encodeWebp(bitmap, maxEdge, quality);

  if (encoded.size > MAX_IMAGE_STORE_BYTES) {
    throw new Error(
      uiText("compressedImageTooLarge", {size: formatDecimal(encoded.size / (1024 * 1024), 1), limit: Math.floor(MAX_IMAGE_STORE_BYTES / (1024 * 1024))}),
    );
  }

  return encoded;
}

export async function convertImageBlobToPng(input: Blob): Promise<Blob> {
  const source =
    input.type === SVG_MIME ? input : await materializeImageBlob(input);

  if (source.type === SVG_MIME) {
    return source;
  }
  if (source.type === PNG_MIME) {
    return source;
  }

  const bitmap = await decodeBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error(uiText("couldnTCreateACanvasToConvertTheImage"));
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const png = await canvasToBlob(canvas, PNG_MIME);
  if (!png || png.size === 0) {
    throw new Error(uiText("couldnTConvertTheImageToPng"));
  }
  return png;
}

export async function compressImage(
  file: File,
  quality = DEFAULT_STORAGE_CONFIG.compressQuality,
): Promise<Blob> {
  return compressIfNeeded(file, {
    ...DEFAULT_STORAGE_CONFIG,
    compressQuality: quality,
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getImageFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }

  return null;
}

export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "data:"
    );
  } catch {
    return false;
  }
}
