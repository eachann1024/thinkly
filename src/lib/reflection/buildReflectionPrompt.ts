import type { AIMessage } from "@/lib/ai-provider";
import type { Page } from "@/types";
import { extractTextFromContent } from "@/components/editor/utils/content-text-extractor";
import { dayKey } from "./weekRange";
import { pageDisplayTitle } from "./noteTitle";
import type { ScopeRange } from "./scopeRange";
import type { ReflectionStats } from "./reflectionStats";

export const REFLECTION_MAX_NOTES = 20;
export const REFLECTION_EXCERPT_CHARS = 400;

export function buildReflectionPrompt(
  pages: Record<string, Page>,
  range: ScopeRange,
  stats: ReflectionStats,
  locale: string,
): AIMessage[] {
  const notes = stats.perNote
    .filter((n) => pages[n.pageId])
    .slice(0, REFLECTION_MAX_NOTES)
    .map((n, i) => {
      const page = pages[n.pageId];
      const excerpt = extractTextFromContent(page.content).replace(/\s+/g, " ").slice(0, REFLECTION_EXCERPT_CHARS);
      return `${i + 1}. ${pageDisplayTitle(page)} (${n.edits} edits, +${n.added} chars)\n${excerpt}`;
    })
    .join("\n\n");
  const language = locale.startsWith("zh") ? "简体中文" : "English";
  const system = [
    "You write a reflection for the user of a note-taking app, based only on the notes they edited in the given period.",
    "Address the user in the second person. Be specific: refer to real note titles, topics and details from the notes. Do not write a generic status report, do not invent facts, do not give advice lists.",
    `Write in ${language}. title: one concrete line (at most 20 words). body: one cohesive paragraph of 3-5 sentences.`,
    "topics: 2-6 themes the notes fall into, each {name (short), description (one sentence), share (integer percent)}; shares sum to 100.",
    'Reply with JSON only: {"title": "...", "body": "...", "topics": [{"name": "...", "description": "...", "share": 40}]}',
  ].join("\n");
  const user = `Period ${dayKey(range.start)} to ${dayKey(range.end - 1)}. ${stats.notes} notes edited, ${stats.total} edits, +${stats.added} chars.\n\n${notes}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
