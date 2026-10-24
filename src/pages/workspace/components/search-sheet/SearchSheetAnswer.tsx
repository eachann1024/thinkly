import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/search-sheet/SearchSheetAnswer.tsx#localMessages:1">`
zh-Hans:
  sources: "来源"
  backToResults: "返回结果"
  continueInAiPanel: "在 AI 面板继续"
  jumpToLatest: "回到最新"
en:
  sources: "Sources"
  backToResults: "Back to results"
  continueInAiPanel: "Continue in AI panel"
  jumpToLatest: "Jump to latest"
ja:
  sources: "出典"
  backToResults: "結果に戻る"
  continueInAiPanel: "AI パネルで続ける"
  jumpToLatest: "最新へ戻る"
`;
const uiText = createTranslator(localMessages);
import { memo, useMemo, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatShortcutToken } from "@/lib/shortcut-platform";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowLeft, ArrowRight, FileText, Globe, MessageSquare, Sparkles } from "@/components/ui/icons";
import type { InfoCardData, WebResultsCardData } from "@/lib/notebook-ai/cards/types";
import { InfoCard } from "../ai-cards/InfoCard";
import { domainOf, openExternalUrl } from "../ai-cards/webLinks";
import { ROW_SPRING } from "../ai-cards/cardMotion";
import { CardActionsProvider } from "../ai-cards/cardActions";
import type { SheetAnswer } from "./useSheetAnswer";
import { visibleSources } from "./sheetAnswerState";
import { SearchSheetSteps } from "./SearchSheetSteps";
import { useStickToBottom } from "./useStickToBottom";

const MD_PLUGINS = { cjk };
const MD_CONTROLS = { table: false, code: true, mermaid: false } as const;
const MD_ANIMATION = { animation: "thinklyRise", duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)", sep: "word" } as const;

type WebLink = WebResultsCardData["results"][number];

function webLinks(cards: InfoCardData[]): WebLink[] {
  const seen = new Set<string>();
  const links: WebLink[] = [];
  for (const card of cards) {
    if (card.kind !== "webResults") continue;
    for (const result of card.results) if (!seen.has(result.url)) { seen.add(result.url); links.push(result); }
  }
  return links.slice(0, 6);
}

export const SearchSheetAnswer = memo(function SearchSheetAnswer({ answer, scrollRef, onBack, onOpenSource, onContinue }: {
  answer: SheetAnswer;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onOpenSource: (id: string) => void;
  onContinue?: (followUp?: string) => void;
}) {
  useLocale();
  const waiting = answer.status === "loading";
  const streaming = answer.status === "streaming";
  const sources = visibleSources(answer);
  const infoCards = answer.cards.filter(card => card.kind !== "webResults");
  const links = webLinks(answer.cards);
  const { following, jumpToLatest } = useStickToBottom(scrollRef);
  const cardActions = useMemo(() => ({ send: onContinue ? (text: string) => onContinue(text) : undefined, busy: waiting || streaming }),
    [onContinue, waiting, streaming]);
  return <section className="search-sheet-answer" aria-live="polite" aria-busy={waiting || streaming}>
    <div className="search-sheet-answer-head">
      <Sparkles size={16} aria-hidden="true"/>
      <span className="search-sheet-answer-question">{answer.question}</span>
    </div>
    <SearchSheetSteps key={answer.requestId} answer={answer}/>
    {infoCards.length > 0 && <CardActionsProvider value={cardActions}><div className="search-sheet-answer-cards">
      {infoCards.map((card, index) => <InfoCard key={`${card.kind}-${index}`} card={card}/>)}
    </div></CardActionsProvider>}
    {answer.text && <Streamdown className="ai-md search-sheet-answer-md" mode="streaming" isAnimating={streaming} animated={MD_ANIMATION}
      plugins={MD_PLUGINS} controls={MD_CONTROLS}>{answer.text}</Streamdown>}
    {answer.status === "error" && <p className="search-sheet-answer-hint" role="alert">{answer.error}</p>}
    {(sources.length > 0 || links.length > 0) && <div className="search-sheet-answer-sources">
      <span className="search-sheet-label">{uiText("sources")}</span>
      {sources.map(({ index, source }) => <Button contentStyle="preserve" variant="ghost" size="sm" key={source.id} className="search-sheet-source" onClick={() => onOpenSource(source.id)}>
        {index && <span className="search-sheet-source-index">{index}</span>}<FileText size={14} aria-hidden="true"/><span className="search-sheet-source-title">{source.title}</span>
      </Button>)}
      {links.map(link => <Button contentStyle="preserve" variant="ghost" size="sm" key={link.url} className="search-sheet-source" data-web="true"
        title={link.url} onClick={() => openExternalUrl(link.url)}>
        <Globe size={14} aria-hidden="true"/><span className="search-sheet-source-title">{link.title || domainOf(link.url)}</span>
        <span className="search-sheet-source-index">{domainOf(link.url)}</span>
      </Button>)}
    </div>}
    <div className="search-sheet-follow" aria-hidden={following || undefined}>
      <AnimatePresence>
        {!following && (waiting || streaming) && <motion.div key="follow" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }} transition={ROW_SPRING}>
          <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-follow-pill" onClick={jumpToLatest}>
            <ArrowDown size={14} aria-hidden="true"/>{uiText("jumpToLatest")}
          </Button>
        </motion.div>}
      </AnimatePresence>
    </div>
    <div className="search-sheet-answer-actions">
      <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true"/>{uiText("backToResults")}<kbd className="search-sheet-kbd" aria-hidden="true">Esc</kbd>
      </Button>
      {onContinue && answer.status !== "loading" && <Button contentStyle="preserve" variant="ghost" size="sm" className="search-sheet-action" data-primary="true" onClick={() => onContinue()}>
        <MessageSquare size={14} aria-hidden="true"/>{uiText("continueInAiPanel")}<kbd className="search-sheet-kbd" aria-hidden="true">{formatShortcutToken("mod")}{formatShortcutToken("enter")}</kbd><ArrowRight size={14} aria-hidden="true"/>
      </Button>}
    </div>
  </section>;
});
