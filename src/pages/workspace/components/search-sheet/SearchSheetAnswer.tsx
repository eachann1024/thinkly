import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheetAnswer.tsx#localMessages:1">`
zh-Hans:
  readingNotes: "正在阅读 {{count}} 篇相关笔记…"
  thinking: "正在思考…"
  tool_understand: "正在理解问题…"
  tool_searchNotes: "正在搜索笔记…"
  tool_readPage: "正在阅读笔记…"
  tool_listPages: "正在查看页面列表…"
  tool_searchWeb: "正在联网搜索…"
  tool_readWebPage: "正在读取网页…"
  sources: "来源"
  backToResults: "返回结果"
  continueInAiPanel: "在 AI 面板继续"
en:
  readingNotes: "Reading related notes ({{count}})…"
  thinking: "Thinking…"
  tool_understand: "Understanding the question…"
  tool_searchNotes: "Searching notes…"
  tool_readPage: "Reading a note…"
  tool_listPages: "Listing notes…"
  tool_searchWeb: "Searching the web…"
  tool_readWebPage: "Reading a web page…"
  sources: "Sources"
  backToResults: "Back to results"
  continueInAiPanel: "Continue in AI panel"
ja:
  readingNotes: "関連ノート {{count}} 件を読み込んでいます…"
  thinking: "考え中…"
  tool_understand: "質問を理解しています…"
  tool_searchNotes: "ノートを検索しています…"
  tool_readPage: "ノートを読み込んでいます…"
  tool_listPages: "ページ一覧を確認しています…"
  tool_searchWeb: "Web を検索しています…"
  tool_readWebPage: "Web ページを読み込んでいます…"
  sources: "出典"
  backToResults: "結果に戻る"
  continueInAiPanel: "AI パネルで続ける"
`;
const uiText = createTranslator(localMessages);
import { memo } from "react";
import { formatShortcutToken } from "@/lib/shortcut-platform";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileText, MessageSquare, Sparkles } from "@/components/ui/icons";
import type { SheetAnswer } from "./useSheetAnswer";
import { visibleSources } from "./sheetAnswerState";

const TOOL_HINTS = {
  understand: "tool_understand",
  searchNotes: "tool_searchNotes", readPage: "tool_readPage", listPages: "tool_listPages", searchWeb: "tool_searchWeb", readWebPage: "tool_readWebPage",
} as const;

function pendingHint(answer: SheetAnswer) {
  const toolKey = answer.tool ? TOOL_HINTS[answer.tool as keyof typeof TOOL_HINTS] : undefined;
  if (toolKey) return uiText(toolKey);
  if (answer.status !== "loading") return null;
  return answer.sources.length ? uiText("readingNotes", {count: answer.sources.length}) : uiText("thinking");
}

const MD_PLUGINS = { cjk };
const MD_CONTROLS = { table: false, code: true, mermaid: false } as const;

export const SearchSheetAnswer = memo(function SearchSheetAnswer({ answer, onBack, onOpenSource, onContinue }: {
  answer: SheetAnswer;
  onBack: () => void;
  onOpenSource: (id: string) => void;
  onContinue?: () => void;
}) {
  useLocale();
  const waiting = answer.status === "loading";
  const hint = pendingHint(answer);
  const sources = visibleSources(answer);
  return <section className="search-sheet-answer" aria-live="polite" aria-busy={waiting || answer.status === "streaming"}>
    <div className="search-sheet-answer-head">
      <Sparkles size={16} aria-hidden="true"/>
      <span className="search-sheet-answer-question">{answer.question}</span>
    </div>
    {answer.text && <Streamdown className="ai-md search-sheet-answer-md" mode="streaming" plugins={MD_PLUGINS} controls={MD_CONTROLS}>{answer.text}</Streamdown>}
    {hint && <p className="search-sheet-answer-hint" data-pending="true">{hint}</p>}
    {answer.status === "error" && <p className="search-sheet-answer-hint" role="alert">{answer.error}</p>}
    {sources.length > 0 && <div className="search-sheet-answer-sources">
      <span className="search-sheet-label">{uiText("sources")}</span>
      {sources.map(({ index, source }) => <Button contentStyle="preserve" variant="ghost" size="sm" key={source.id} className="search-sheet-source" onClick={() => onOpenSource(source.id)}>
        {index && <span className="search-sheet-source-index">{index}</span>}<FileText size={14} aria-hidden="true"/><span className="search-sheet-source-title">{source.title}</span>
      </Button>)}
    </div>}
    <div className="search-sheet-answer-actions">
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true"/>{uiText("backToResults")}<kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd>
      </Button>
      {onContinue && answer.status !== "loading" && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" data-primary="true" onClick={onContinue}>
        <MessageSquare size={14} aria-hidden="true"/>{uiText("continueInAiPanel")}<kbd className="search-sheet-kbd" aria-hidden="true">{formatShortcutToken("mod")}{formatShortcutToken("enter")}</kbd><ArrowRight size={14} aria-hidden="true"/>
      </Button>}
    </div>
  </section>;
});
