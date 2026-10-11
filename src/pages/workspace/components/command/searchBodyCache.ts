import type { Page } from "@/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { extractTextFromContent } from "@/components/editor/utils/content-text-extractor";

type Entry = { content: Page["content"]; updatedAt: number; title: string; text: string };
const textCache = new Map<string, Entry>();
const MAX_ENTRIES = 512;
const MAX_TEXT_CHARACTERS = 2_000_000;
const MAX_ENTRY_CHARACTERS = 200_000;
let textCharacters = 0;

function removeEntry(id: string): void {
  const entry = textCache.get(id);
  if (!entry) return;
  textCharacters -= entry.text.length;
  textCache.delete(id);
}

export function pruneSearchBodyCache(pageIds: Set<string>): void {
  for (const id of textCache.keys()) if (!pageIds.has(id)) removeEntry(id);
}

export function clearSearchBodyCache(): void {
  textCache.clear();
  textCharacters = 0;
}

export function getCachedText(page: Page): string {
  const title = getPageTitle(page);
  const hit = textCache.get(page.id);
  if (hit && hit.updatedAt === page.updatedAt && hit.content === page.content && hit.title === title) {
    textCache.delete(page.id);
    textCache.set(page.id, hit);
    return hit.text;
  }
  removeEntry(page.id);
  const content = page.content;
  const body = Array.isArray(content) && content[0]?.type === "heading" &&
    extractTextFromContent([content[0]]).trim() === title.trim()
    ? content.slice(1) : content;
  const text = extractTextFromContent(body);
  if (text.length > MAX_ENTRY_CHARACTERS) return text;
  textCache.set(page.id, { updatedAt: page.updatedAt, content, title, text });
  textCharacters += text.length;
  while (textCache.size > MAX_ENTRIES || textCharacters > MAX_TEXT_CHARACTERS) {
    removeEntry(textCache.keys().next().value!);
  }
  return text;
}

export const getSearchBodyText = getCachedText;
