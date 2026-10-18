import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconButton } from "@/components/ui/icon-button";
import { Check, Copy } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { editorPlatform } from "@/lib/editor-platform/resolve";
import type { DefinitionCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { EASE_OUT_EXPO, rowVariants } from "./cardMotion";
import "./ai-cards-info.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/DefinitionCard.tsx#messages:1">`
zh-Hans:
  copy: "复制词条"
  copied: "已复制"
  examples: "例句"
en:
  copy: "Copy entry"
  copied: "Copied"
  examples: "Examples"
ja:
  copy: "用語をコピー"
  copied: "コピーしました"
  examples: "例文"
`;
const t = createTranslator(messages);

function entryText(card: DefinitionCardData) {
  const head = [card.term, card.phonetic, card.partOfSpeech].filter(Boolean).join("  ");
  const definitions = card.definitions.map((text, i) => `${i + 1}. ${text}`);
  const examples = (card.examples ?? []).map(text => `> ${text}`);
  return [head, ...definitions, ...examples].join("\n");
}

function CopyButton({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = () => void editorPlatform.clipboard.copyText(text).then(() => setCopied(true), () => undefined);
  const label = copied ? t("copied") : t("copy");
  return <TooltipProvider delayDuration={600}>
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton size="sm" tone="muted" type="button" aria-label={label} onClick={copy} className="ai-def-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={copied ? "done" : "copy"} className="ai-def-copy-icon"
              initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}>
              {copied ? <Check size={14}/> : <Copy size={14}/>}
            </motion.span>
          </AnimatePresence>
        </IconButton>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>;
}

export function DefinitionCard({ card }: { card: DefinitionCardData }) {
  useLocale();
  return <div className="ai-def">
    <motion.div className="ai-def-head" variants={rowVariants}>
      <span className="ai-def-term">{card.term}</span>
      {card.phonetic && <span className="ai-def-phonetic">{card.phonetic}</span>}
      {card.partOfSpeech && <span className="ai-chip">{card.partOfSpeech}</span>}
      <CopyButton text={entryText(card)}/>
    </motion.div>
    <ol className="ai-def-list">
      {card.definitions.map((text, index) => <motion.li key={index} variants={rowVariants}>
        <span className="ai-def-index goose-tabular">{index + 1}</span><span>{text}</span>
      </motion.li>)}
    </ol>
    {card.examples && card.examples.length > 0 && <ul className="ai-def-examples" aria-label={t("examples")}>
      {card.examples.map((text, index) => <motion.li key={index} variants={rowVariants}>{text}</motion.li>)}
    </ul>}
  </div>;
}
