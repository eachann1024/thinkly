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
  const stalledNotes = stats.stalled
    .filter((n) => pages[n.pageId])
    .map((n) => pageDisplayTitle(pages[n.pageId]))
    .join("、");
  const language = locale.startsWith("zh") ? "简体中文" : "English";
  const system = [
    "You are a thoughtful friend who has read the notes this person wrote during the period, and you tell them what you noticed.",
    `Write in ${language}.`,
    "Voice: speak to them as \"you\", in complete, natural sentences a person would say out loud. Every sentence must be understandable on its own by someone who has not read the notes.",
    "Never do these: telegraphic or headline style; stacks of quoted note titles; copying phrases out of the notes verbatim; jargon lifted from the notes without explaining it; generic filler such as \"keep it up\"; any judgement about whether the note contents are sensitive, private or risky; inventing anything the data does not show.",
    "title: one natural sentence saying what this period was mainly about, at most 24 characters.",
    "themes: 2-3 items. name is a plain label of at most 6 characters. point is 1-2 natural sentences, at most 60 characters, saying what they were actually working on and why it mattered; it may name at most one note, and must explain the subject in your own words rather than quoting it.",
    "suggestion: one concrete, actionable sentence grounded in the activity data (for example a note that has stalled, or where the effort is concentrated). Use an empty string if nothing useful follows from the data.",
    "topics: 2-6 areas the notes fall into, each {name (short), description (one natural sentence), share (integer percent)}; shares sum to 100.",
    'Reply with JSON only: {"title": "...", "themes": [{"name": "...", "point": "..."}], "suggestion": "...", "topics": [{"name": "...", "description": "...", "share": 40}]}',
  ].join("\n");
  const facts = [
    `Period ${dayKey(range.start)} to ${dayKey(range.end - 1)}: ${stats.notes} notes edited, ${stats.total} edits, +${stats.added} chars.`,
    stats.busiestDay === null ? "" : `Most active day: ${dayKey(stats.busiestDay)}.`,
    stats.peakHour === null ? "" : `Most edits around ${stats.peakHour}:00.`,
    stalledNotes ? `Stalled (no edits for two weeks or more): ${stalledNotes}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const user = `${facts}\n\nNotes edited, most active first:\n\n${notes}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
