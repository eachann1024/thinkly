import { htmlLooksLikeBlockNoteClipboard } from "./multilinePaste";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|heic|heif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|avi|mkv|flv|wmv)$/i;
const clipboardFileCache = new WeakMap<object, { file: File; mime: string }[]>();

export function isPasteableClipboardImageFile(
  file: File,
  itemType: string,
): boolean {
  if (itemType.startsWith("image/")) return true;
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

export function clipboardHasPasteableImage(
  data: DataTransfer | null | undefined,
): boolean {
  return extractClipboardFiles(data).some(({ file, mime }) =>
    isPasteableClipboardImageFile(file, mime),
  );
}

export type ClipboardImageSource = {
  items?: ArrayLike<{
    kind: string;
    type: string;
    getAsFile: () => File | null;
  }> | null;
  files?: ArrayLike<File> | null;
};

export function extractClipboardFiles(
  data: ClipboardImageSource | null | undefined,
): { file: File; mime: string }[] {
  if (data && clipboardFileCache.has(data)) return clipboardFileCache.get(data)!;
  const files: { file: File; mime: string }[] = [];
  for (const item of Array.from(data?.items ?? [])) {
    const file = item.kind === "file" ? item.getAsFile() : null;
    if (file) files.push({ file, mime: item.type || file.type });
  }
  const resolved = files.length
    ? files
    : Array.from(data?.files ?? []).map((file) => ({ file, mime: file.type }));
  if (data && resolved.length) clipboardFileCache.set(data, resolved);
  return resolved;
}

export function isClipboardImageType(type: string): boolean {
  return type.startsWith("image/") || type === "public.png" || type === "public.tiff" || type === "image/tiff";
}

export function shouldDeferPasteToMediaHandler(
  data: { types?: ArrayLike<string> } | null | undefined,
  allowVideo: boolean,
): boolean {
  const types = data?.types;
  if (!types?.length) return false;
  let media = false;
  for (const type of Array.from(types)) {
    if (type === "blocknote/html") return false;
    if (type === "Files" || isClipboardImageType(type) || (allowVideo && type.startsWith("video/"))) media = true;
  }
  return media;
}

export type ClipboardPasteRoute = "blocks" | "media-files" | "default";

export function resolveClipboardPasteRoute(
  data: (ClipboardImageSource & { getData?: (type: string) => string }) | null | undefined,
  allowVideo: boolean,
): ClipboardPasteRoute {
  if (!data) return "default";
  const types = (data as { types?: ArrayLike<string> }).types;
  if (types && types.length) {
    let interesting = false;
    for (const type of Array.from(types)) {
      if (
        type === "Files" || type === "text/html" || type === "blocknote/html" ||
        isClipboardImageType(type) || type.startsWith("video/")
      ) {
        interesting = true;
        break;
      }
    }
    if (!interesting) return "default";
  }
  const files = extractClipboardFiles(data);
  const read = (type: string) => {
    try {
      return data.getData?.(type) ?? "";
    } catch {
      return "";
    }
  };
  if (read("blocknote/html") || htmlLooksLikeBlockNoteClipboard(read("text/html"))) return "blocks";
  const hasImage = files.some(({ file, mime }) => isPasteableClipboardImageFile(file, mime));
  const hasVideo = allowVideo && files.some(({ file, mime }) => isPasteableClipboardVideoFile(file, mime));
  return hasImage || hasVideo ? "media-files" : "default";
}

export function shouldReadNativeClipboardImage(
  data: (ClipboardImageSource & { types?: ArrayLike<string>; getData?: (type: string) => string }) | null | undefined,
): boolean {
  if (!data) return false;
  const types = Array.from(data.types ?? []);
  const imageType = types.some(isClipboardImageType);
  const filesType = types.includes("Files");
  const emptyEvent = types.length === 0;
  if (!imageType && !filesType && !emptyEvent) return false;
  const files = extractClipboardFiles(data);
  if (files.some(({ file, mime }) => isPasteableClipboardImageFile(file, mime))) return false;
  if (imageType || (filesType && files.length === 0)) return true;
  if (!emptyEvent) return false;
  let plain = "";
  let html = "";
  try {
    plain = data.getData?.("text/plain") ?? "";
    html = data.getData?.("text/html") ?? "";
  } catch {
    return true;
  }
  return !plain.trim() && !html.trim();
}

export function extractClipboardImageFiles(
  data: ClipboardImageSource | null | undefined,
): File[] {
  if (!data) return [];

  const fromItems: File[] = [];
  const items = data.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;
      if (!isPasteableClipboardImageFile(file, item.type)) continue;
      const mime =
        (file.type.startsWith("image/") && file.type) ||
        (item.type.startsWith("image/") && item.type) ||
        resolveImageMimeForUpload(file);
      fromItems.push(
        file.type === mime
          ? file
          : new File([file], file.name || `paste-${Date.now()}.png`, {
              type: mime,
              lastModified: file.lastModified,
            }),
      );
    }
  }
  if (fromItems.length > 0) return fromItems;

  const fromFiles: File[] = [];
  const files = data.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isImageUploadFile(file)) fromFiles.push(file);
    }
  }
  return fromFiles;
}

export function isPasteableClipboardVideoFile(
  file: File,
  itemType: string,
): boolean {
  return (
    itemType.startsWith("video/") ||
    file.type.startsWith("video/") ||
    VIDEO_EXT.test(file.name)
  );
}

export function clipboardHasPasteableMedia(
  data: DataTransfer | null | undefined,
): boolean {
  return extractClipboardFiles(data).some(({ file, mime }) =>
    isPasteableClipboardImageFile(file, mime) ||
    isPasteableClipboardVideoFile(file, mime),
  );
}

export function isImageUploadFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

export function shouldUploadViaImageStorage(
  file: File,
  blockId: string | undefined,
  getBlock: ((id: string) => { type?: string } | undefined) | null | undefined,
): boolean {
  if (isImageUploadFile(file)) return true;
  if (!blockId || !getBlock) return false;
  const block = getBlock(blockId);
  return block?.type === "image" || block?.type === "imageResize";
}

export function resolveImageMimeForUpload(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    heic: "image/heic",
    heif: "image/heif",
    tif: "image/tiff",
    tiff: "image/tiff",
  };
  if (ext && map[ext]) return map[ext];
  return "image/png";
}
