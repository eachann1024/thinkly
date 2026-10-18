import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ExchangeCardData } from "@/lib/notebook-ai/cards/types";
import { EASE_OUT_EXPO, rowVariants, useCountUp } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/ExchangeCard.tsx#messages:1">`
zh-Hans:
  rate: "1 {{base}} = {{rate}} {{quote}}"
  asOf: "{{date}} 汇率"
  trend: "近 {{days}} 天走势"
en:
  rate: "1 {{base}} = {{rate}} {{quote}}"
  asOf: "Rate as of {{date}}"
  trend: "{{days}}-day trend"
ja:
  rate: "1 {{base}} = {{rate}} {{quote}}"
  asOf: "{{date}} のレート"
  trend: "過去 {{days}} 日間の推移"
`;
const t = createTranslator(messages);

function formatAmount(value: number, digits = 2) {
  return new Intl.NumberFormat(getFormatLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** 汇率小数位随量级变化：0.0071 这类小汇率需要更多有效位。 */
function rateDigits(rate: number) {
  if (rate >= 100) return 2;
  if (rate >= 1) return 4;
  return Math.min(8, 2 + Math.ceil(-Math.log10(rate || 1)) + 2);
}

const WIDTH = 120;
const HEIGHT = 32;

function sparkPath(points: number[]) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = WIDTH / Math.max(1, points.length - 1);
  return points.map((value, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(HEIGHT - 3 - ((value - min) / span) * (HEIGHT - 6)).toFixed(1)}`).join(" ");
}

function Sparkline({ history }: { history: ExchangeCardData["history"] }) {
  const reduce = useReducedMotion();
  const clipId = `ai-spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const path = useMemo(() => sparkPath(history.map(h => h.rate)), [history]);
  const rising = history[history.length - 1].rate >= history[0].rate;
  return <svg className="ai-card-spark" data-trend={rising ? "up" : "down"} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}
    role="img" aria-label={t("trend", { days: history.length })}>
    <defs><clipPath id={clipId}><motion.rect x="0" y="0" height={HEIGHT}
      initial={{ width: reduce ? WIDTH : 0 }} animate={{ width: WIDTH }} transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.12 }}/></clipPath></defs>
    <path d={path} clipPath={`url(#${clipId})`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

export function ExchangeCard({ card }: { card: ExchangeCardData }) {
  useLocale();
  const converted = useCountUp(card.converted);
  const history = card.history.length >= 2 ? card.history : null;
  return <div className="ai-card-exchange">
    <motion.div className="ai-card-exchange-main" variants={rowVariants}>
      <span className="ai-card-exchange-from goose-tabular">{formatAmount(card.amount)} {card.base} =</span>
      <span className="ai-card-exchange-to goose-tabular">{formatAmount(converted)}<span className="ai-card-exchange-code">{card.quote}</span></span>
    </motion.div>
    <motion.div className="ai-card-exchange-foot" variants={rowVariants}>
      <span className="ai-card-exchange-rate goose-tabular">
        {t("rate", { base: card.base, quote: card.quote, rate: formatAmount(card.rate, rateDigits(card.rate)) })}
        <span className="ai-card-muted">{t("asOf", { date: card.date })}</span>
      </span>
      {history && <Sparkline history={history}/>}
    </motion.div>
  </div>;
}
