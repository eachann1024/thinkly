import { getGooseDesktop } from "@/lib/electron/runtime";
import { clearResolvedUrlCache, resolveCachedUrl } from "./resolvedUrlCache";

export const clearResolvedImageObjectUrlCache = clearResolvedUrlCache;

export async function resolveImageRefToUrl(
  url: string,
  pageLocalFilePath?: string | null,
): Promise<string> {
  if (/^(https?:|data:|blob:)/.test(url)) return url;
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
    async () => /^att:goose-img\/[a-f0-9]{64}\./.test(url) ? url : null,
    async () => {
      return (await import("./index")).imageStorage.load(url);
    },
  );
}
