import type JSZipNs from "jszip";
import { blobToBase64 } from "@/lib/imageStorage/utils";
import { isLocalFilePath } from "@/lib/imageStorage/strategies/file-system";
import { parseBase64Asset, getRelativeAssetPath, guessAssetExtFromPath, resolveAndReadBase64 } from "./assetPaths";

let imageStoragePromise: Promise<{
  imageStorage: { load: (ref: string) => Promise<Blob | null> };
}> | null = null;

const getImageStorage = async () => {
  if (!imageStoragePromise) {
    imageStoragePromise = import("@/lib/imageStorage");
  }
  return imageStoragePromise;
};

const EXPORTABLE_ASSET_BLOCK_TYPES = new Set([
  "image",
  "imageResize",
  "file",
  "audio",
  "video",
]);

export async function extractImagesFromContent(
  content: any[],
  assetsFolder: JSZipNs,
  imageMap: Map<string, string>,
  usedAssetNames: Set<string>,
  depth: number,
  notebookPath?: string,
  pageFilePath?: string,
) {
  const fallbackBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGD4DwABBAEAf6S4JwAAAABJRU5ErkJggg==";

  for (const block of content) {
    if (!block || typeof block !== "object") continue;

    if (EXPORTABLE_ASSET_BLOCK_TYPES.has(block.type) && block.props?.url) {
      const src = block.props.url;
      let finalSrc = src;
      const isImage = block.type === "image" || block.type === "imageResize";
      const isLocalAsset = isLocalFilePath(src);

      if (!isLocalAsset && imageMap.has(src)) {
        block.props.url = getRelativeAssetPath(imageMap.get(src)!, depth);
        continue;
      }

      if (isImage && (src.startsWith("uuid:") || src.startsWith("att:"))) {
        const { imageStorage } = await getImageStorage();
        const blob = await imageStorage.load(src);
        if (blob) {
          finalSrc = await blobToBase64(blob);
        } else {
          finalSrc = fallbackBase64;
        }
      }
      if (!isImage && src.startsWith("att-file:")) {
        const { fileStorage } = await import("@/lib/fileStorage");
        const blob = await fileStorage.load(src);
        if (blob) {
          finalSrc = await blobToBase64(blob);
        }
      }
      if (block.type === "video" && src.startsWith("att-video:")) {
        const { videoStorage } = await import("@/lib/videoStorage");
        const blob = await videoStorage.load(src, pageFilePath);
        if (blob) {
          finalSrc = await blobToBase64(blob);
        }
      }

      if (isLocalAsset) {
        const loadedAsset = resolveAndReadBase64(
          notebookPath,
          src,
          pageFilePath,
        );
        if (loadedAsset) {
          const imageMapKey = `local:${loadedAsset.resolvedPath}`;
          if (imageMap.has(imageMapKey)) {
            block.props.url = getRelativeAssetPath(
              imageMap.get(imageMapKey)!,
              depth,
            );
            continue;
          }
          const ext = guessAssetExtFromPath(src, isImage ? "png" : "bin");
          const rawName =
            src.split(/[\\/]/).pop() || `img_${Date.now()}.${ext}`;
          const uniqueName = usedAssetNames.has(rawName)
            ? `${rawName.replace(/\.([^.]+)$/, "")}_${Math.random().toString(36).slice(2, 6)}.${ext}`
            : rawName;
          assetsFolder.file(uniqueName, loadedAsset.data, { base64: true });
          imageMap.set(imageMapKey, uniqueName);
          usedAssetNames.add(uniqueName);
          block.props.url = getRelativeAssetPath(uniqueName, depth);
        }
        continue;
      }

      if (imageMap.has(finalSrc)) {
        block.props.url = getRelativeAssetPath(imageMap.get(finalSrc)!, depth);
        continue;
      }

      if (finalSrc.startsWith("data:")) {
        const parsed = parseBase64Asset(finalSrc);
        if (parsed) {
          const fallbackPrefix = isImage ? "img" : "file";
          const rawName =
            !isImage && typeof block.props?.name === "string"
              ? block.props.name
              : "";
          const hasExt = /\.[a-zA-Z0-9]{1,8}$/.test(rawName);
          const candidate = rawName
            ? hasExt
              ? rawName
              : `${rawName}.${parsed.extension}`
            : `${fallbackPrefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}.${parsed.extension}`;
          const filename = usedAssetNames.has(candidate)
            ? `${candidate.replace(/\.([^.]+)$/, "")}_${Math.random().toString(36).slice(2, 6)}.${parsed.extension}`
            : candidate;
          assetsFolder.file(filename, parsed.data, { base64: true });

          imageMap.set(finalSrc, filename);
          if (src !== finalSrc) {
            imageMap.set(src, filename);
          }
          usedAssetNames.add(filename);
          block.props.url = getRelativeAssetPath(filename, depth);
        }
      }
    }

    if (block.children?.length) {
      await extractImagesFromContent(
        block.children,
        assetsFolder,
        imageMap,
        usedAssetNames,
        depth,
        notebookPath,
        pageFilePath,
      );
    }
  }
}
