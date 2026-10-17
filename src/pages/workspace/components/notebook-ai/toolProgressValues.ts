
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/toolProgressValues.ts#messages:1">`
zh-Hans:
  createNote: "新建笔记"
  editNotes: "修改笔记"
  deleteNotes: "删除笔记"
  searchNotes: "搜索笔记"
  chat: "对话"
  visualization: "可视化"
  webResearch: "网页研究"
en:
  createNote: "Create note"
  editNotes: "Edit notes"
  deleteNotes: "Delete notes"
  searchNotes: "Search notes"
  chat: "Chat"
  visualization: "Visualization"
  webResearch: "Web research"
`;
const t = createTranslator(messages);
export function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function truncate(text: string, max = 28) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export const SKILL_LABELS: Record<string, string> = {
  get createNoote() { return t("createNote"); },
  get updateNote() { return t("editNotes"); },
  get deleteNote() { return t("deleteNotes"); },
  get searchNotes() { return t("searchNotes"); },
  get chat() { return t("chat"); },
  get visual() { return t("visualization"); },
  get webResearch() { return t("webResearch"); },
};
