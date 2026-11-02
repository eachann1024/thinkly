import { extractTextFromContent } from "@/components/editor/utils/content-text-extractor";
import { createTranslator, i18nYaml } from "@/i18n";
import type { Page } from "@/types";

const messages = i18nYaml<"src/lib/notebook-ai/noteCitation.ts#messages:1">`
zh-Hans:
  section: "「{{heading}}」小节"
  paragraph: "第 {{number}} 段"
en:
  section: "“{{heading}}” section"
  paragraph: "Paragraph {{number}}"
ja:
  section: "「{{heading}}」セクション"
  paragraph: "第 {{number}} 段落"
`;
const t = createTranslator(messages);

import { readNoteLocation, type NoteBlockLocation } from "./noteCitationLocation";
export { readNoteLocation, type NoteBlockLocation } from "./noteCitationLocation";

export interface NoteBlockExcerpt { location: NoteBlockLocation; text: string }
export interface NoteCitation { pageId: string; location?: NoteBlockLocation }
const PREFIX = "#thinkly-note=";
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function noteLocationLabel(location?: NoteBlockLocation): string {
  if (!location) return "";
  return location.heading ? t("section", { heading: location.heading }) : t("paragraph", { number: location.paragraph });
}

export function noteSourceLabel(title: string, location?: NoteBlockLocation): string {
  const label = noteLocationLabel(location);
  return label ? `${title} · ${label}` : title;
}

export function noteCitationHref(pageId: string, location?: NoteBlockLocation): string {
  return PREFIX + encodeURIComponent(JSON.stringify({ pageId, location }))
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function parseNoteCitationHref(href?: string): NoteCitation | undefined {
  if (!href?.startsWith(PREFIX) || href.length > 16000) return;
  try {
    const value = JSON.parse(decodeURIComponent(href.slice(PREFIX.length)));
    if (typeof value?.pageId !== "string" || !value.pageId.trim() || value.pageId.length > 4096) return;
    return { pageId: value.pageId, location: readNoteLocation(value.location) };
  } catch { return; }
}

/** Read each block's own text, so a parent's excerpt never includes its children. */
export function noteBlockExcerpts(content: Page["content"], pageTitle = ""): NoteBlockExcerpt[] {
  const result: NoteBlockExcerpt[] = [];
  let blockIndex = 0, paragraph = 0;
  const headings: Array<{ level: number; text: string }> = [];
  const walk = (blocks: any[]) => {
    const inherited = headings.slice();
    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      const index = blockIndex++;
      const text = normalize(extractTextFromContent([{ ...block, children: [] }]));
      const isHeading = block.type === "heading";
      if (isHeading) {
        const level = Number(block.props?.level ?? block.attrs?.level ?? 1);
        while (headings.length && headings.at(-1)!.level >= level) headings.pop();
        if (text && !(index === 0 && text === normalize(pageTitle))) headings.push({ level, text });
      } else if (text) paragraph++;
      if (text) result.push({ text, location: {
        ...(typeof block.id === "string" && block.id ? { blockId: block.id } : {}),
        blockIndex: index, paragraph: Math.max(1, paragraph), text: text.slice(0, 160),
        ...(headings.length ? { heading: headings.at(-1)!.text.slice(0, 200) } : {}),
      } });
      if (Array.isArray(block.children)) walk(block.children);
    }
    headings.splice(0, headings.length, ...inherited);
  };
  walk(Array.isArray(content) ? content : []);
  return result;
}

export function bestNoteBlock(page: Page, terms: string[], title = ""): NoteBlockExcerpt | undefined {
  const blocks = noteBlockExcerpts(page.content, title);
  let best: NoteBlockExcerpt | undefined, bestScore = 0;
  for (const block of blocks) {
    const lower = block.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (!term) continue;
      let from = 0, count = 0;
      while ((from = lower.indexOf(term.toLowerCase(), from)) >= 0 && count < 5) { count++; from += term.length; }
      score += count * Math.min(term.length, 6);
    }
    if (score > bestScore) { best = block; bestScore = score; }
  }
  return best ?? blocks.find(block => block.text !== block.location.heading && block.text !== normalize(title)) ?? blocks[0];
}

export function noteCitationsInText(text: string): NoteCitation[] {
  const citations = new Map<string, NoteCitation>();
  for (const match of text.matchAll(/\]\((#thinkly-note=[^\s)]+)\)/g)) {
    const citation = parseNoteCitationHref(match[1]);
    if (citation) citations.set(noteCitationKey(citation.pageId, citation.location), citation);
  }
  return [...citations.values()];
}

export function noteCitationKey(pageId: string, location?: NoteBlockLocation): string {
  return `${pageId}:${location?.blockId ?? location?.blockIndex ?? "page"}`;
}

export function locationForQuotedText(page: Page | undefined, text: string): NoteBlockLocation | undefined {
  if (!page) return;
  const quote = normalize(text);
  if (!quote) return;
  const matches = noteBlockExcerpts(page.content).filter(block => block.text.includes(quote) || quote.startsWith(block.text));
  return matches.length === 1 ? matches[0].location : undefined;
}
