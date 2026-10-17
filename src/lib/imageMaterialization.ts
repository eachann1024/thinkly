import { formatDecimal } from "@/i18n/format";
import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageMaterialization.ts#localMessages:1">`
zh-Hans:
  unknownImageFormat: "无法识别的图片格式（{{type}}，{{size}}MB）"
  theClipboardImageIsEmptyCopyItAgainBefore: "剪贴板图片为空，请重新复制后再粘贴"
en:
  unknownImageFormat: "Unrecognized image format ({{type}}, {{size}} MB)"
  theClipboardImageIsEmptyCopyItAgainBefore: "The clipboard image is empty. Copy it again before pasting."
ja:
  unknownImageFormat: "認識できない画像形式です（{{type}}、{{size}}MB）"
  theClipboardImageIsEmptyCopyItAgainBefore: "クリップボードの画像が空です。もう一度コピーしてから貼り付けてください"
`;
const uiText = createTranslator(localMessages);
export const WEBP_MIME = "image/webp";
export const PNG_MIME = "image/png";
export const SVG_MIME = "image/svg+xml";

type RasterMime =
  | "image/webp"
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/bmp";

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

/** 用文件头识别真实图片类型；剪贴板 File.type 经常为空或错误 */
function detectRasterMime(
  bytes: Uint8Array,
  declaredType: string,
): RasterMime | null {
  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return WEBP_MIME;
  }

  // PNG
  if (
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return PNG_MIME;
  }

  // JPEG
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  // GIF
  if (
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }

  // BMP
  if (startsWithBytes(bytes, [0x42, 0x4d])) {
    return "image/bmp";
  }

  if (
    declaredType === WEBP_MIME ||
    declaredType === PNG_MIME ||
    declaredType === "image/jpeg" ||
    declaredType === "image/jpg" ||
    declaredType === "image/gif" ||
    declaredType === "image/bmp"
  ) {
    return declaredType === "image/jpg"
      ? "image/jpeg"
      : (declaredType as RasterMime);
  }

  return null;
}

/**
 * 将剪贴板/上传文件固化为带正确 MIME 的 Blob。
 * Electron/Electron 大图粘贴时，延迟读取的 File 可能失效；先读完字节再处理。
 */
export async function materializeImageBlob(
  input: Blob | File,
  preferredMime?: string,
): Promise<Blob> {
  const buffer = await input.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error(uiText("theClipboardImageIsEmptyCopyItAgainBefore"));
  }

  const bytes = new Uint8Array(buffer);
  const declared =
    (input.type && input.type.startsWith("image/") ? input.type : "") ||
    (preferredMime && preferredMime.startsWith("image/")
      ? preferredMime
      : "") ||
    "";

  if (declared === SVG_MIME || input.type === SVG_MIME) {
    return new Blob([buffer], { type: SVG_MIME });
  }

  const detected = detectRasterMime(bytes, declared);
  if (!detected) {
    throw new Error(
      uiText("unknownImageFormat", {type: declared || 'unknown', size: formatDecimal(buffer.byteLength / (1024 * 1024), 1)}),
    );
  }

  return new Blob([buffer], { type: detected });
}
