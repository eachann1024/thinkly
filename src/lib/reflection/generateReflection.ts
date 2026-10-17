import { runAIText, type AISettingsLike } from "@/lib/ai-provider";
import type { Page } from "@/types";
import { buildReflectionPrompt } from "./buildReflectionPrompt";
import type { WeekRange } from "./weekRange";
import type { WeekStats } from "./weekStats";

export interface ReflectionNarrative {
  title: string;
  body: string;
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** 容错解析：代码围栏、前后多余文字，或完全不是 JSON 时按「首行标题 + 其余正文」。 */
export function parseReflectionText(raw: string): ReflectionNarrative | null {
  const text = raw.replace(/```(?:json)?/gi, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const title = clean(data.title);
      const body = clean(data.body);
      if (title && body) return { title, body };
    } catch {
      /* 继续走纯文本兜底 */
    }
  }
  const [first, ...rest] = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const body = rest.join("\n");
  if (!first || !body || first.startsWith("{")) return null;
  return { title: first.replace(/^#+\s*/, ""), body };
}

export async function generateReflection(
  settings: AISettingsLike,
  pages: Record<string, Page>,
  week: WeekRange,
  stats: WeekStats,
  locale: string,
  signal?: AbortSignal,
): Promise<ReflectionNarrative> {
  const raw = await runAIText(settings, buildReflectionPrompt(pages, week, stats, locale), { abortSignal: signal });
  const parsed = parseReflectionText(raw);
  if (!parsed) throw new Error("Invalid reflection response");
  return parsed;
}
