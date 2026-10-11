type KatexRenderer = Pick<typeof import("katex"), "renderToString">;
const MAX_ENTRIES = 64;
const MAX_BYTES = 1024 * 1024;
const cache = new Map<string, string>();
let bytes = 0;
let renderer: Promise<KatexRenderer> | null = null;

/** Keep repeated formulas cheap across previews without retaining an entire notebook. */
export async function renderMathPreview(value: string, displayMode: boolean) {
  const key = JSON.stringify([value, displayMode]);
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  renderer ??= import("katex").then(module => module.default);
  const katex = await renderer;
  // Another preview may have filled the cache while the shared import was pending.
  const pendingResult = cache.get(key);
  if (pendingResult !== undefined) return pendingResult;
  const html = katex.renderToString(value || "\\text{empty}", { displayMode, throwOnError: false });
  const size = (key.length + html.length) * 2;
  if (size <= MAX_BYTES) {
    cache.set(key, html);
    bytes += size;
    while (cache.size > MAX_ENTRIES || bytes > MAX_BYTES) {
      const oldest = cache.entries().next().value;
      if (!oldest) break;
      cache.delete(oldest[0]);
      bytes -= (oldest[0].length + oldest[1].length) * 2;
    }
  }
  return html;
}
