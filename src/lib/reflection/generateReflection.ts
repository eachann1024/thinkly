import { runAIText, type AISettingsLike } from "@/lib/ai-provider";
import type { Page } from "@/types";
import { buildReflectionPrompt } from "./buildReflectionPrompt";
import type { ScopeRange } from "./scopeRange";
import type { ReflectionStats } from "./reflectionStats";

export interface ReflectionTopic {
  name: string;
  description: string;
  /** 百分比，所有主题合计 100。 */
  share: number;
}

/** 结构化要点：简短主题名 + 一两句话。 */
export interface ReflectionTheme {
  name: string;
  point: string;
}

export interface ReflectionNarrative {
  title: string;
  /** 旧格式的整段正文；新格式为空串。 */
  body: string;
  topics: ReflectionTopic[];
  themes?: ReflectionTheme[];
  suggestion?: string;
}

const MAX_TOPICS = 6;
const MAX_THEMES = 4;
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** 把 share 缩放到合计 100（最大余数法）；无有效数据返回空。 */
export function normalizeTopics(raw: unknown): ReflectionTopic[] {
  if (!Array.isArray(raw)) return [];
  const items = raw
    .map((t) => {
      const r = (t ?? {}) as Record<string, unknown>;
      return { name: clean(r.name), description: clean(r.description), share: Number(r.share) };
    })
    .filter((t) => t.name && Number.isFinite(t.share) && t.share > 0)
    .slice(0, MAX_TOPICS);
  const sum = items.reduce((a, t) => a + t.share, 0);
  if (!sum) return [];
  const scaled = items.map((t) => (t.share / sum) * 100);
  const floors = scaled.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  scaled
    .map((v, i) => [v - floors[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rest-- > 0) floors[i] += 1;
    });
  return items.map((t, i) => ({ name: t.name, description: t.description, share: floors[i] }));
}

function normalizeThemes(raw: unknown): ReflectionTheme[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => {
      const r = (t ?? {}) as Record<string, unknown>;
      return { name: clean(r.name), point: clean(r.point) };
    })
    .filter((t) => t.name && t.point)
    .slice(0, MAX_THEMES);
}

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
      const themes = normalizeThemes(data.themes);
      if (title && (themes.length || body)) {
        const suggestion = clean(data.suggestion);
        return {
          title,
          body: themes.length ? "" : body,
          topics: normalizeTopics(data.topics),
          ...(themes.length ? { themes } : {}),
          ...(themes.length && suggestion ? { suggestion } : {}),
        };
      }
    } catch {
      /* 继续走纯文本兜底 */
    }
  }
  const [first, ...rest] = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const body = rest.join("\n");
  if (!first || !body || first.startsWith("{")) return null;
  return { title: first.replace(/^#+\s*/, ""), body, topics: [] };
}

export async function generateReflection(
  settings: AISettingsLike,
  pages: Record<string, Page>,
  range: ScopeRange,
  stats: ReflectionStats,
  locale: string,
  signal?: AbortSignal,
): Promise<ReflectionNarrative> {
  const raw = await runAIText(settings, buildReflectionPrompt(pages, range, stats, locale), { abortSignal: signal });
  const parsed = parseReflectionText(raw);
  if (!parsed) throw new Error("Invalid reflection response");
  return parsed;
}
