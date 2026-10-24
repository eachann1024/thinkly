import { renderMathInWorker } from "./mathWorkerClient";
import { schedulePreviewCommit } from "../shared/previewCommitQueue";
const MAX_ENTRIES = 64;
const MAX_BYTES = 1024 * 1024;
const cache = new Map<string, string>();
let bytes = 0;
const pending = new Map<string, Promise<string>>();

async function getMathPreview(value: string, displayMode: boolean) {
  const key = JSON.stringify([value, displayMode]);
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const existing = pending.get(key);
  if (existing) return existing;
  const request = renderMathInWorker(value, displayMode);
  pending.set(key, request);
  let html: string;
  try { html = await request; } finally { pending.delete(key); }
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

export async function renderMathPreview(value: string, displayMode: boolean) {
  const html = await getMathPreview(value, displayMode);
  if (!displayMode) return html;
  return new Promise<string>(resolve => schedulePreviewCommit(() => resolve(html)));
}
