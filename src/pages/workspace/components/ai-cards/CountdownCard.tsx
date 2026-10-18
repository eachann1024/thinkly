import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CountdownCardData } from "@/lib/notebook-ai/cards/types";
import { ROW_SPRING, rowVariants } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/CountdownCard.tsx#messages:1">`
zh-Hans:
  days: "天"
  hours: "时"
  minutes: "分"
  seconds: "秒"
  arrived: "已到"
  invalid: "无法识别的时间"
en:
  days: "Days"
  hours: "Hours"
  minutes: "Min"
  seconds: "Sec"
  arrived: "It’s here"
  invalid: "Unrecognized time"
ja:
  days: "日"
  hours: "時間"
  minutes: "分"
  seconds: "秒"
  arrived: "到達しました"
  invalid: "認識できない日時"
`;
const t = createTranslator(messages);

/** 对齐整秒刷新。 */
function useSecondClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer = 0;
    const tick = () => { setNow(Date.now()); timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8); };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** 数字变化时旧值上滑淡出、新值自下方滑入。 */
function Tile({ value, label }: { value: string; label: string }) {
  const reduce = useReducedMotion();
  const offset = reduce ? 0 : 10;
  return <motion.span className="ai-card-countdown-tile" variants={rowVariants}>
    <span className="ai-card-countdown-digits goose-tabular" aria-label={`${value} ${label}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: offset, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -offset, opacity: 0 }}
          transition={ROW_SPRING} aria-hidden="true">{value}</motion.span>
      </AnimatePresence>
    </span>
    <span className="ai-card-countdown-unit">{label}</span>
  </motion.span>;
}

function formatTarget(date: Date) {
  return new Intl.DateTimeFormat(getFormatLocale(), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** 实时倒计时：天 / 时 / 分 / 秒四格逐秒滑动，到点后显示已到。 */
export function CountdownCard({ card }: { card: CountdownCardData }) {
  useLocale();
  const now = useSecondClock();
  const target = new Date(card.target);
  const valid = !Number.isNaN(target.getTime());
  if (!valid) return <p className="ai-card-muted">{t("invalid")}</p>;
  const diff = Math.max(0, Math.floor((target.getTime() - now) / 1000));
  const arrived = diff === 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return <div className="ai-card-countdown" data-arrived={arrived || undefined}>
    {arrived
      ? <motion.p className="ai-card-countdown-arrived" variants={rowVariants}>{t("arrived")}</motion.p>
      : <div className="ai-card-countdown-tiles" role="timer">
        <Tile value={String(Math.floor(diff / 86400))} label={t("days")}/>
        <Tile value={pad(Math.floor((diff % 86400) / 3600))} label={t("hours")}/>
        <Tile value={pad(Math.floor((diff % 3600) / 60))} label={t("minutes")}/>
        <Tile value={pad(diff % 60)} label={t("seconds")}/>
      </div>}
    <motion.span className="ai-card-muted goose-tabular" variants={rowVariants}>{formatTarget(target)}</motion.span>
  </div>;
}
