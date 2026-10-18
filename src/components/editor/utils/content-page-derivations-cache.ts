import type { Page } from "@/types";
import { extractPlainText } from "./blocknote-content";
import { countWordsInText, extractStructureSummary } from "./content-text-extractor";
import type { ContentDerivations } from "./content-derivations-cache";

type SummaryOptions = Parameters<typeof extractStructureSummary>[1];
type PageContentVersion = Pick<Page, "content" | "updatedAt">;
interface Entry {
  value: ContentDerivations;
  summaries: Map<string, string>;
  size: number;
}

const MAX_ENTRIES = 64;
const MAX_CHARS = 2_000_000;
// The WeakMap stores only a token, so evicting an entry also releases every derived string.
const tokens = new WeakMap<object, { updatedAt: number; token: number }>();
const entries = new Map<number, Entry>();
let nextToken = 0;
let retainedChars = 0;

function derive(content: Page["content"]): ContentDerivations {
  const text = extractPlainText(content);
  return Object.freeze({
    text,
    wordCount: countWordsInText(text),
    substantiveFingerprint: text.replace(/\s+/g, ""),
  });
}

function remove(token: number): void {
  const entry = entries.get(token);
  if (!entry) return;
  retainedChars -= entry.size;
  entries.delete(token);
}

function trim(): void {
  while (entries.size > MAX_ENTRIES || retainedChars > MAX_CHARS) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    remove(oldest);
  }
}

/** Store pages replace content on edits; updatedAt additionally guards same-reference version changes. */
function getEntry(page: PageContentVersion): { entry: Entry; token?: number } {
  const content = page.content;
  if (!content || typeof content !== "object") {
    return { entry: { value: derive(content), summaries: new Map(), size: 0 } };
  }
  const known = tokens.get(content);
  if (known?.updatedAt === page.updatedAt) {
    const entry = entries.get(known.token);
    if (entry) {
      entries.delete(known.token);
      entries.set(known.token, entry);
      return { entry, token: known.token };
    }
  }
  if (known) remove(known.token);
  const value = derive(content);
  const size = value.text.length + value.substantiveFingerprint.length;
  const entry: Entry = { value, summaries: new Map(), size };
  if (size > MAX_CHARS / 4) return { entry };
  const token = ++nextToken;
  tokens.set(content, { updatedAt: page.updatedAt, token });
  entries.set(token, entry);
  retainedChars += size;
  trim();
  return { entry, token };
}

export function clearContentDerivationsCache(): void {
  entries.clear();
  retainedChars = 0;
}

export function getContentDerivationsForPage(page: PageContentVersion): ContentDerivations {
  return getEntry(page).entry.value;
}

/** A replaced content object invalidates summaries, including block ID-only changes. */
export function getContentStructureSummaryForPage(page: PageContentVersion, options?: SummaryOptions): string {
  const { entry, token } = getEntry(page);
  const key = JSON.stringify([
    options?.summaryMaxChars ?? 120,
    options?.maxSummaryParagraphs ?? 3,
    options?.includeBlockIds ?? false,
  ]);
  const previous = entry.summaries.get(key);
  if (previous !== undefined) return previous;
  const summary = extractStructureSummary(page.content, options);
  const size = key.length + summary.length;
  if (token !== undefined && size <= 32_000 && entry.summaries.size < 8) {
    entry.summaries.set(key, summary);
    entry.size += size;
    retainedChars += size;
    trim();
  }
  return summary;
}
