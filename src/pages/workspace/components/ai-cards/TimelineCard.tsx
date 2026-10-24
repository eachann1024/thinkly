import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ChevronDown } from "@/components/ui/icons";
import type { TimelineCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { EASE_OUT_EXPO, rowVariants } from "./cardMotion";
import "./ai-cards-info.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/TimelineCard.tsx#messages:1">`
zh-Hans:
  more: "展开"
  less: "收起"
en:
  more: "Show more"
  less: "Show less"
ja:
  more: "もっと見る"
  less: "閉じる"
`;
const t = createTranslator(messages);

const LONG_DETAIL = 90;

const dotVariants: Variants = {
  hidden: { pathLength: 0, fillOpacity: 0 },
  shown: { pathLength: 1, fillOpacity: 1, transition: { pathLength: { duration: 0.5, ease: EASE_OUT_EXPO }, fillOpacity: { delay: 0.28, duration: 0.24 } } },
};

function Detail({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const long = text.length > LONG_DETAIL;
  const [open, setOpen] = useState(false);
  if (!long) return <p className="ai-tl-detail">{text}</p>;
  return <>
    <motion.p className="ai-tl-detail" data-clamped={!open || undefined} layout={reduce ? false : "size"}
      transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}>{text}</motion.p>
    <button type="button" className="ai-tl-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {open ? t("less") : t("more")}
      <ChevronDown size={12} aria-hidden="true" data-open={open || undefined}/>
    </button>
  </>;
}

export function TimelineCard({ card }: { card: TimelineCardData }) {
  useLocale();
  return <ol className="ai-tl">
    {card.events.map((event, index) => <motion.li key={`${index}-${event.time}`} className="ai-tl-item" variants={rowVariants}>
      <span className="ai-tl-rail" aria-hidden="true">
        <svg className="ai-tl-dot" width="12" height="12" viewBox="0 0 12 12">
          <motion.circle cx="6" cy="6" r="4.25" fill="currentColor" stroke="currentColor" strokeWidth="1.5" variants={dotVariants}/>
        </svg>
      </span>
      <div className="ai-tl-body">
        <div className="ai-tl-line">
          <span className="ai-tl-time goose-tabular">{event.time}</span>
          <span className="ai-tl-title">{event.title}</span>
        </div>
        {event.detail && <Detail text={event.detail}/>}
      </div>
    </motion.li>)}
  </ol>;
}
