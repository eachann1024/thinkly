import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageStorage/strategies/file-system.ts#localMessages:1">`
zh-Hans:
  couldnTSaveTheImageToTheLocalFolder: "图片写入本地文件夹失败"
en:
  couldnTSaveTheImageToTheLocalFolder: "Couldn’t save the image to the local folder"
ja:
  couldnTSaveTheImageToTheLocalFolder: "画像をローカルフォルダに保存できませんでした"
`;
const uiText = createTranslator(localMessages);

import type { IImageStorageStrategy } from "../types";
import { blobToBase64 } from "../utils";
import { fs } from "@/lib/electron-platform/fs";
import { isInternalAssetRef } from "@/lib/internalAssetRef";

const LOCAL_FILE_EXTENSIONS =
  /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff?|html?|pdf|txt|md|markdown|json|csv|zip|mp3|m4a|wav|ogg|oga|flac|aac|opus|weba|mp4|m4v|mov|webm|ogv)$/i;

import { guessMime } from "./fileMime";


export function readLocalFileAsBlob(fullPath: string): Blob | null {
  try {
    const gfs = (window as any).gooseFs;
    if (!gfs) return null;

    if (typeof gfs.readFileBase64 === "function") {
      const base64 = gfs.readFileBase64(fullPath) as string | null;
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: guessMime(fullPath) });
    }

    if (!gfs.exists(fullPath)) return null;
    const text = gfs.readFile(fullPath);
    if (!text) return null;
    if (fullPath.toLowerCase().endsWith(".svg")) {
      return new Blob([text], { type: "image/svg+xml" });
    }
    return null;
  } catch {
    return null;
  }
}

export async function readLocalFileAsBlobAsync(
  fullPath: string,
): Promise<Blob | null> {
  try {
    const gfs = (window as any).gooseFs;
    if (!gfs) return null;
    const mime = guessMime(fullPath);

    if (typeof gfs.readFileBase64Async === "function") {
      const base64 = (await gfs.readFileBase64Async(fullPath)) as string | null;
      if (base64) return base64ToUint8Blob(base64, mime);
    }

    if (typeof gfs.readFileBase64 === "function") {
      const base64 = gfs.readFileBase64(fullPath) as string | null;
      if (base64) return base64ToUint8Blob(base64, mime);
    }

    if (
      fullPath.toLowerCase().endsWith(".svg") &&
      typeof gfs.readFileAsync === "function"
    ) {
      const text = (await gfs.readFileAsync(fullPath)) as string | null;
      if (text) return new Blob([text], { type: "image/svg+xml" });
    }
    return null;
  } catch {
    return null;
  }
}

function base64ToUint8Blob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function readLocalFileAsBase64(fullPath: string): string | null {
  try {
    const gfs = (window as any).gooseFs;
    if (!gfs) return null;
    if (typeof gfs.readFileBase64 === "function") {
      return gfs.readFileBase64(fullPath) as string | null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isLocalFilePath(ref: string): boolean {
  if (!ref || ref.length === 0) return false;
  if (
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("data:") ||
    ref.startsWith("blob:") ||
    isInternalAssetRef(ref)
  ) {
    return false;
  }
  if (ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref)) return true;
  if (/^\.{1,2}[\\/]/.test(ref)) return true;
  if (!ref.includes("://") && LOCAL_FILE_EXTENSIONS.test(ref)) return true;
  return false;
}

export function resolveToAbsolute(basePath: string, ref: string): string {
  const sep = basePath.includes("\\") ? "\\" : "/";
  if (ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref)) return ref;
  const base = basePath.replace(/[\\/]+$/, "");
  const normalized = ref.replace(/^\.[\\/]/, "");
  const parts = `${base}${sep}${normalized}`.split(/[\\/]/);
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === "..") resolved.pop();
    else if (p !== "." && p !== "") resolved.push(p);
  }
  const prefix = basePath.startsWith("/") ? "/" : "";
  return prefix + resolved.join(sep);
}

export class FileSystemStrategy implements IImageStorageStrategy {
  private readonly getPagePath?: () => string | null | Promise<string | null>;

  constructor(getPagePath?: () => string | null | Promise<string | null>) {
    this.getPagePath = getPagePath;
  }

  async save(blob: Blob, mimeType: string): Promise<string> {
    if (!fs.isAvailable()) {
      throw new Error("gooseFs not available");
    }

    const pagePath = await this.getCurrentPagePath();
    if (!pagePath) {
      throw new Error("No local page path found");
    }

    const assetsDir = `${pagePath.replace(/[\\/][^\\/]+$/, "")}/assets`;
    if (!fs.exists(assetsDir)) {
      await fs.mkdir(assetsDir);
    }

    const timestamp = Date.now();
    const random = crypto.randomUUID().slice(0, 8);
    const ext = this.getExtension(mimeType);
    const filename = `img_${timestamp}_${random}.${ext}`;

    const base64 = await blobToBase64(blob);
    const base64Data = base64.split(",")[1];
    const fullPath = `${assetsDir}/${filename}`;

    const gfs = (window as any).gooseFs;
    const saved =
      typeof gfs?.writeFileAsync === "function"
        ? await fs.writeFileAsync(fullPath, base64Data, "base64")
        : fs.writeFile(fullPath, base64Data, "base64");
    if (!saved) {
      throw new Error(uiText("couldnTSaveTheImageToTheLocalFolder"));
    }

    return `./assets/${filename}`;
  }

  async load(ref: string): Promise<Blob | null> {
    const pagePath = await this.getCurrentPagePath();
    let fullPath: string;

    if (ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref)) {
      fullPath = ref;
    } else if (pagePath) {
      fullPath = resolveToAbsolute(pagePath.replace(/[\\/][^\\/]+$/, ""), ref);
    } else {
      return null;
    }

    return readLocalFileAsBlobAsync(fullPath);
  }

  async delete(ref: string): Promise<void> {
    if (!fs.isAvailable()) return;

    const pagePath = await this.getCurrentPagePath();
    if (!pagePath) return;

    let fullPath: string;
    if (ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref)) {
      fullPath = ref;
    } else {
      fullPath = resolveToAbsolute(pagePath.replace(/[\\/][^\\/]+$/, ""), ref);
    }

    await fs.deleteFile(fullPath);
  }

  canHandle(ref: string): boolean {
    return isLocalFilePath(ref);
  }

  private async getCurrentPagePath(): Promise<string | null> {
    return (await Promise.resolve(this.getPagePath?.())) || null;
  }

  private getExtension(mimeType: string): string {
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
    };
    return extMap[mimeType] || "jpg";
  }
}
