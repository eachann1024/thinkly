export const MAX_LOCAL_ASSET_BYTES = 256 * 1024 * 1024;
export const MAX_LOCAL_ASSET_BATCH_BYTES = 512 * 1024 * 1024;

export function canAcceptLocalAssetBytes(size: number, acceptedBytes = 0): boolean {
  return Number.isFinite(size) && size > 0 && size <= MAX_LOCAL_ASSET_BYTES &&
    Number.isFinite(acceptedBytes) && acceptedBytes >= 0 && acceptedBytes + size <= MAX_LOCAL_ASSET_BATCH_BYTES;
}

export interface LocalAssetTarget {
  pageLocalFilePath: string;
  notebookRoot: string;
  workspaceId?: string;
  pageId?: string;
}

export interface SaveLocalAssetRequest {
  pageLocalFilePath: string;
  notebookRoot: string;
  name: string;
  data: Uint8Array;
}

export interface SavedLocalAssetPath {
  url: string;
  absolutePath: string;
}

export type LocalAssetKind = "image" | "audio" | "video" | "file";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif", "ico"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "ogg", "oga", "flac", "aac", "opus", "weba"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "webm", "mov", "ogv"]);

/** MIME alone must never turn an HTML/executable attachment into a preview. */
export function getLocalAssetKindForFile(file: Pick<File, "name" | "type">): LocalAssetKind {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type.toLowerCase().split(";", 1)[0];
  const kind = IMAGE_EXTENSIONS.has(extension) ? "image"
    : AUDIO_EXTENSIONS.has(extension) ? "audio"
      : VIDEO_EXTENSIONS.has(extension) ? "video" : "file";
  if (kind === "file" || !mime || mime === "application/octet-stream") return kind;
  if (kind === "audio" && (mime === "application/ogg" || mime === "video/ogg")) return kind;
  return mime.startsWith(`${kind}/`) ? kind : "file";
}
