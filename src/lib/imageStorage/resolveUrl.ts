import { getGooseDesktop } from "@/lib/electron/runtime";
import { clearResolvedUrlCache, resolveCachedUrl } from "./resolvedUrlCache";

/** Kept for compatibility; cached data URLs do not require explicit revocation. */
export const clearResolvedImageObjectUrlCache = clearResolvedUrlCache;

/** Resolve a resource, merging reads while preserving mounted consumers on eviction. */
export async function resolveImageRefToUrl(
  url: string,
  pageLocalFilePath?: string | null,
): Promise<string> {
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  // Normal video playback uses owned blob leases. Keep this legacy callback
  // playable without leaking ownerless object URLs; its data URLs are not retained.
  const { videoStorage } = await import("@/lib/videoStorage");
  if (videoStorage.canHandle(url)) {
    return resolveCachedUrl(`legacy-video:${pageLocalFilePath ?? ""}:${url}`, url,
      async () => null, () => videoStorage.load(url, pageLocalFilePath));
  }
  const { isLocalFilePath, resolveToAbsolute, readLocalFileAsBlobAsync } =
    await import("./strategies/file-system");
  if (isLocalFilePath(url)) {
    const absolute = url.startsWith("/") || /^[A-Za-z]:[\\/]/.test(url);
    const fullPath = absolute
      ? resolveToAbsolute(url.replace(/[\\/][^\\/]+$/, ""), url)
      : pageLocalFilePath
        ? resolveToAbsolute(pageLocalFilePath.replace(/[\\/][^\\/]+$/, ""), url)
        : null;
    if (!fullPath) return url;
    return resolveCachedUrl(`local:${fullPath}`, url, async () => {
      try {
        const stat = await getGooseDesktop()?.fsStat(fullPath);
        return stat ? `${stat.size}:${stat.mtimeMs}` : null;
      } catch {
        return null;
      }
    }, () => readLocalFileAsBlobAsync(fullPath));
  }
  return resolveCachedUrl(url, url,
    // Content-addressed attachments are immutable. Legacy UUID resources are not.
    async () => /^att:goose-img\/[a-f0-9]{64}\./.test(url) ? url : null,
    async () => {
      return (await import("./index")).imageStorage.load(url);
    },
  );
}
