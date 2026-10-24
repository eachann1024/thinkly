import { createTranslator, i18nYaml } from "@/i18n";
import type { SheetStep } from "./sheetAnswerState";

const messages = i18nYaml<"src/pages/workspace/components/search-sheet/sheetStepText.ts#messages:1">`
zh-Hans:
  understand: "理解问题"
  retrieve: "检索笔记"
  retrieveFound: "找到 {{count}} 篇相关笔记"
  retrieveNone: "没有直接相关的摘录"
  thinking: "思考"
  searchNotes: "搜索笔记"
  readPage: "阅读笔记"
  listPages: "查看页面列表"
  searchWeb: "联网搜索"
  readWebPage: "读取网页"
  getWeather: "查询天气"
  getExchangeRate: "查询汇率"
  getWorldTime: "查看时间"
  composeRunning: "正在组织回答"
  compose: "组织回答"
  tool: "调用工具"
  found: "{{count}} 条"
  noResults: "无结果"
  failed: "失败"
  summary: "已完成 {{count}} 步"
  summaryNotes: "阅读 {{count}} 篇笔记"
  summaryWeb: "联网 {{count}} 次"
  summaryFailed: "{{count}} 步失败"
en:
  understand: "Understand the question"
  retrieve: "Search notes"
  retrieveFound: "Found {{count}} related notes"
  retrieveNone: "No directly related excerpts"
  thinking: "Thinking"
  searchNotes: "Search notes"
  readPage: "Read note"
  listPages: "List notes"
  searchWeb: "Search the web"
  readWebPage: "Read web page"
  getWeather: "Check weather"
  getExchangeRate: "Check exchange rate"
  getWorldTime: "Check time"
  composeRunning: "Writing the answer"
  compose: "Write the answer"
  tool: "Use tool"
  found: "{{count}} results"
  noResults: "No results"
  failed: "Failed"
  summary: "{{count}} steps done"
  summaryNotes: "read {{count}} notes"
  summaryWeb: "{{count}} web searches"
  summaryFailed: "{{count}} failed"
ja:
  understand: "質問を理解"
  retrieve: "ノートを検索"
  retrieveFound: "関連ノートが {{count}} 件見つかりました"
  retrieveNone: "直接関連する抜粋はありません"
  thinking: "思考中"
  searchNotes: "ノートを検索"
  readPage: "ノートを読む"
  listPages: "ページ一覧を確認"
  searchWeb: "Web 検索"
  readWebPage: "Web ページを読み取る"
  getWeather: "天気を調べる"
  getExchangeRate: "為替レートを調べる"
  getWorldTime: "時刻を確認"
  composeRunning: "回答を作成中"
  compose: "回答を作成"
  tool: "ツールを呼び出す"
  found: "{{count}} 件"
  noResults: "結果なし"
  failed: "失敗"
  summary: "{{count}} ステップ完了"
  summaryNotes: "ノート {{count}} 件を読み取り"
  summaryWeb: "Web 検索 {{count}} 回"
  summaryFailed: "{{count}} ステップ失敗"
`;
const t = createTranslator(messages);

const TOOL_LABELS = ["searchNotes", "readPage", "listPages", "searchWeb", "readWebPage", "getWeather", "getExchangeRate", "getWorldTime"] as const;
type ToolLabel = (typeof TOOL_LABELS)[number];
const isToolLabel = (name: string): name is ToolLabel => (TOOL_LABELS as readonly string[]).includes(name);

export function stepLabel(step: SheetStep) {
  if (step.name === "understand") return t("understand");
  if (step.name === "retrieve") return t("retrieve");
  if (step.name === "thinking") return t("thinking");
  if (step.name === "compose") return step.status === "running" ? t("composeRunning") : t("compose");
  const action = isToolLabel(step.name) ? t(step.name) : t("tool");
  if (!step.subject) return action;
  const subject = step.subject.length > 32 ? `${step.subject.slice(0, 31)}…` : step.subject;
  if (step.name === "readPage") return `${action}《${subject}》`;
  if (step.name === "searchNotes" || step.name === "searchWeb") return `${action}「${subject}」`;
  return `${action} · ${subject}`;
}

export function stepResult(step: SheetStep) {
  if (step.status === "error") return t("failed");
  if (step.status !== "done" || step.count === undefined) return "";
  if (step.name === "retrieve") return step.count ? t("retrieveFound", { count: step.count }) : t("retrieveNone");
  return step.count ? t("found", { count: step.count }) : t("noResults");
}

export function stepsSummary(steps: SheetStep[]) {
  const visible = steps.filter(step => step.name !== "compose");
  const notes = steps.filter(step => step.name === "readPage" && step.status === "done").length;
  const web = steps.filter(step => step.name === "searchWeb" && step.status === "done").length;
  const failed = steps.filter(step => step.status === "error").length;
  return [
    t("summary", { count: visible.length }),
    notes ? t("summaryNotes", { count: notes }) : "",
    web ? t("summaryWeb", { count: web }) : "",
    failed ? t("summaryFailed", { count: failed }) : "",
  ].filter(Boolean).join(" · ");
}
