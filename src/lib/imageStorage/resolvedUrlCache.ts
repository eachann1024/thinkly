/** Data URLs have no external lifetime: eviction cannot revoke a mounted consumer. */
const MAX_ENTRIES = 128;
const MAX_BYTES = 32 * 1024 * 1024;
const entries = new Map<string, { version: string; url: string }>();
const pending = new Map<string, Promise<string>>();
let bytes = 0;
let generation = 0;

export function clearResolvedUrlCache() {
  generation++;
  entries.clear();
  pending.clear();
  bytes = 0;
}

export function resolveCachedUrl(
  key: string,
  fallback: string,
  getVersion: () => Promise<string | null>,
  load: () => Promise<Blob | null>,
): Promise<string> {
  const underway = pending.get(key);
  if (underway) return underway;
  const epoch = generation;
  const request = (async () => {
    const version = await getVersion();
    const previous = entries.get(key);
    if (version !== null && previous?.version === version) {
      entries.delete(key);
      entries.set(key, previous);
      return previous.url;
    }
    if (previous) {
      bytes -= previous.url.length * 2;
      entries.delete(key);
    }
    const blob = await load();
    if (!blob) return fallback;
    const { blobToBase64 } = await import("./utils");
    const url = await blobToBase64(blob);
    const size = url.length * 2;
    if (epoch === generation && version !== null && size <= MAX_BYTES) {
      entries.set(key, { version, url });
      bytes += size;
      while (entries.size > MAX_ENTRIES || bytes > MAX_BYTES) {
        const oldest = entries.entries().next().value;
        if (!oldest) break;
        entries.delete(oldest[0]);
        bytes -= oldest[1].url.length * 2;
      }
    }
    return url;
  })();
  pending.set(key, request);
  void request.finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  }).catch(() => {});
  return request;
}
