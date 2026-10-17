import type { HistoryIndexEntry } from "@/lib/history/types";
import {
  createEditorSafeContent,
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { editorSchema } from "@/components/editor/core/EditorComposer";
import { i18nYaml, createTranslator, getFormatLocale } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/history-view/historyViewPresentation.tsx#messages:1">`
zh-Hans:
  automatic: "自动"
  manual: "手动"
  beforeChanges: "操作前"
  today: "今天"
  yesterday: "昨天"
  daysAgo: "{{count}} 天前"
en:
  automatic: "Automatic"
  manual: "Manual"
  beforeChanges: "Before changes"
  today: "Today"
  yesterday: "Yesterday"
  daysAgo: "{{count}} days ago"
`;
const t = createTranslator(messages);


export const TRIGGER_LABEL: Record<HistoryIndexEntry["trigger"], string> = {
  get idle() { return t("automatic"); },
  get manual() { return t("manual"); },
  get "pre-op"() { return t("beforeChanges"); },
};

export type SelectedHistoryStatus =
  | "idle"
  | "loading"
  | "ready"
  | "missing"
  | "error";

export function triggerLabel(trigger: HistoryIndexEntry["trigger"]): string {
  return TRIGGER_LABEL[trigger] ?? t("automatic");
}

export function createSafeHistoryContent(
  content: unknown,
): BlockNoteContent | null {
  try {
    return createEditorSafeContent(
      normalizePageContent(content as any),
      editorSchema,
    );
  } catch (error) {
    console.error("[history] normalize history content failed", error);
    return null;
  }
}

export function formatGroupLabel(ts: number, now: number): string {
  const d1 = new Date(ts);
  const d2 = new Date(now);
  const day1 = new Date(
    d1.getFullYear(),
    d1.getMonth(),
    d1.getDate(),
  ).getTime();
  const day2 = new Date(
    d2.getFullYear(),
    d2.getMonth(),
    d2.getDate(),
  ).getTime();
  const diffDays = Math.floor((day2 - day1) / (24 * 3600 * 1000));
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return t("daysAgo", { count: diffDays });
  return d1.toLocaleDateString(getFormatLocale(), { month: "long", day: "numeric" });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(getFormatLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}
