import type { HistoryVersion } from "./types";
import { normalizeHistoryVersion } from "./guards";
import { getHistoryVisibleSignature } from "./contentSignature";

const MAX_ENTRIES = 24;
const MAX_CHARS = 2_000_000;
const entries = new Map<string, { source: string; version: HistoryVersion; signature: string; size: number }>();
const loadedSignatures = new WeakMap<HistoryVersion, string>();
let retainedChars = 0;

/** Fresh disk text remains the authority: this cache only avoids repeated parse/normalization/signature work. */
export function parseHistoryVersion(path: string, text: string | null, pageId: string, versionId: string): HistoryVersion | null {
  const previous = entries.get(path);
  if (previous && previous.source === text) {
    entries.delete(path);
    entries.set(path, previous);
    const version = structuredClone(previous.version);
    loadedSignatures.set(version, previous.signature);
    return version;
  }
  if (previous) {
    retainedChars -= previous.size;
    entries.delete(path);
  }
  if (!text) return null;
  const version = normalizeHistoryVersion(JSON.parse(text), pageId, versionId);
  if (!version) return null;
  const signature = getHistoryVisibleSignature(version.content, version.localFrontmatter);
  const size = text.length * 2 + signature.length;
  if (size <= MAX_CHARS / 4) {
    entries.set(path, { source: text, version: structuredClone(version), signature, size });
    retainedChars += size;
    while (entries.size > MAX_ENTRIES || retainedChars > MAX_CHARS) {
      const key = entries.keys().next().value;
      if (key === undefined) break;
      retainedChars -= entries.get(key)!.size;
      entries.delete(key);
    }
  }
  loadedSignatures.set(version, signature);
  return version;
}

/** DB revisions are validated by the repository on every read; missing revisions bypass caching. */
export function readRevisionHistoryVersion(
  key: string, revision: string | undefined, value: unknown, pageId: string, versionId: string,
): HistoryVersion | null {
  if (!revision) {
    invalidateHistoryVersion(key);
    return normalizeHistoryVersion(value, pageId, versionId);
  }
  const previous = entries.get(key);
  if (previous?.source === revision) {
    entries.delete(key);
    entries.set(key, previous);
    const version = structuredClone(previous.version);
    loadedSignatures.set(version, previous.signature);
    return version;
  }
  invalidateHistoryVersion(key);
  const version = normalizeHistoryVersion(value, pageId, versionId);
  if (!version) return null;
  const signature = getHistoryVisibleSignature(version.content, version.localFrontmatter);
  const size = JSON.stringify(version).length + signature.length;
  if (size <= MAX_CHARS / 4) {
    entries.set(key, { source: revision, version: structuredClone(version), signature, size });
    retainedChars += size;
    while (entries.size > MAX_ENTRIES || retainedChars > MAX_CHARS) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      invalidateHistoryVersion(oldest);
    }
  }
  loadedSignatures.set(version, signature);
  return version;
}

/** Only call on a freshly loaded, unmodified version; restore callers receive a separate editable clone. */
export function getLoadedHistorySignature(version: HistoryVersion): string {
  return loadedSignatures.get(version) ?? getHistoryVisibleSignature(version.content, version.localFrontmatter);
}

export function invalidateHistoryVersion(path: string): void {
  const previous = entries.get(path);
  if (!previous) return;
  retainedChars -= previous.size;
  entries.delete(path);
}
