import type { AIMessage } from "@/lib/ai-provider";
import type { Page } from "@/types";
import { extractTextFromContent, extractTitleFromContent } from "@/components/editor/utils/content-text-extractor";
import { dayKey, type WeekRange } from "./weekRange";
import { pagesEditedInWeek, type WeekStats } from "./weekStats";

export const REFLECTION_MAX_NOTES = 20;
export const REFLECTION_EXCERPT_CHARS = 400;

export function pageDisplayTitle(page: Page): string {
  const fromContent = extractTitleFromContent(page.content).trim();
  if (fromContent) return fromContent;
  const name = page.localFilePath?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "");
  return name?.trim() || "Untitled";
}

export function buildReflectionPrompt(
  pages: Record<string, Page>,
  week: WeekRange,
  stats: WeekStats,
  locale: string,
): AIMessage[] {
  const notes = pagesEditedInWeek(pages, week)
    .slice(0, REFLECTION_MAX_NOTES)
    .map((page, i) => {
      const excerpt = extractTextFromContent(page.content).replace(/\s+/g, " ").slice(0, REFLECTION_EXCERPT_CHARS);
      return `${i + 1}. [${dayKey(page.updatedAt)}] ${pageDisplayTitle(page)}\n${excerpt}`;
    })
    .join("\n\n");
  const language = locale.startsWith("zh") ? "简体中文" : "English";
  const system = [
    "You write a weekly reflection for the user of a note-taking app, based only on the notes they edited last week.",
    "Address the user in the second person. Be specific: refer to real note titles, topics and details from the notes. Do not write a generic status report, do not invent facts, do not give advice lists.",
    `Write in ${language}. Title: one concrete line (at most 20 words). Body: one cohesive paragraph of 3-5 sentences.`,
    'Reply with JSON only: {"title": "...", "body": "..."}',
  ].join("\n");
  const user = `Week ${dayKey(week.start)} to ${dayKey(week.end - 1)}. ${stats.notes} notes edited, ${stats.total} edits.\n\n${notes}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
