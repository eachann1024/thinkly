import type { JSONContent } from "@/types";
import { extractPlainText } from "./blocknote-content";
import { countWordsInText } from "./content-text-extractor";

export interface ContentDerivations {
  readonly text: string;
  readonly wordCount: number;
  readonly substantiveFingerprint: string;
}

const MAX_ENTRIES = 64;
const MAX_CHARS = 2_000_000;
const cache = new Map<string, { value: ContentDerivations; size: number }>();
let retainedChars = 0;

export function getContentDerivations(content: JSONContent, revision: string): ContentDerivations {
  const cached = cache.get(revision);
  if (cached) {
    cache.delete(revision);
    cache.set(revision, cached);
    return cached.value;
  }
  const text = extractPlainText(content);
  const value = Object.freeze({ text, wordCount: countWordsInText(text), substantiveFingerprint: text.replace(/\s+/g, "") });
  const size = revision.length + text.length + value.substantiveFingerprint.length;
  if (size > MAX_CHARS / 4) return value;
  cache.set(revision, { value, size });
  retainedChars += size;
  while (cache.size > MAX_ENTRIES || retainedChars > MAX_CHARS) {
    const key = cache.keys().next().value;
    if (key === undefined) break;
    retainedChars -= cache.get(key)!.size;
    cache.delete(key);
  }
  return value;
}
