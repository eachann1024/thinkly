import { memo } from "react";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, FileText, MessageSquare, Sparkles } from "@/components/ui/icons";
import type { SheetAnswer } from "./useSheetAnswer";

const MD_PLUGINS = { cjk };
const MD_CONTROLS = { table: false, code: true, mermaid: false } as const;

export const SearchSheetAnswer = memo(function SearchSheetAnswer({ answer, onBack, onOpenSource, onContinue }: {
  answer: SheetAnswer;
  onBack: () => void;
  onOpenSource: (id: string) => void;
  onContinue?: () => void;
}) {
  const waiting = answer.status === "loading";
  return <section className="search-sheet-answer" aria-live="polite" aria-busy={waiting || answer.status === "streaming"}>
    <div className="search-sheet-answer-head">
      <Sparkles size={16} aria-hidden="true"/>
      <span className="search-sheet-answer-question">{answer.question}</span>
    </div>
    {waiting && <p className="search-sheet-answer-hint" data-pending="true">{answer.sources.length ? `正在阅读 ${answer.sources.length} 篇相关笔记…` : "正在思考…"}</p>}
    {answer.text && <Streamdown className="ai-md search-sheet-answer-md" mode="streaming" plugins={MD_PLUGINS} controls={MD_CONTROLS}>{answer.text}</Streamdown>}
    {answer.status === "error" && <p className="search-sheet-answer-hint" role="alert">{answer.error}</p>}
    {answer.sources.length > 0 && <div className="search-sheet-answer-sources">
      <span className="search-sheet-label">来源</span>
      {answer.sources.map((source, index) => <Button contentStyle="preserve" variant="ghost" size="sm" key={source.id} className="search-sheet-source" onClick={() => onOpenSource(source.id)}>
        <span className="search-sheet-source-index">{index + 1}</span><FileText size={14} aria-hidden="true"/><span className="search-sheet-source-title">{source.title}</span>
      </Button>)}
    </div>}
    <div className="search-sheet-answer-actions">
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true"/>返回结果<kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd>
      </Button>
      {onContinue && answer.status !== "loading" && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" data-primary="true" onClick={onContinue}>
        <MessageSquare size={14} aria-hidden="true"/>在 AI 面板继续<ArrowRight size={14} aria-hidden="true"/>
      </Button>}
    </div>
  </section>;
});
