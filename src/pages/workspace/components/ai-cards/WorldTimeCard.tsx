import { useLocale, getFormatLocale, createTranslator, i18nYaml } from "@/i18n";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "@/components/ui/icons";
import type { WorldTimeCardData } from "@/lib/notebook-ai/cards/types";
import { rowVariants } from "./cardMotion";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/WorldTimeCard.tsx#messages:1">`
zh-Hans:
  ahead: "快 {{hours}} 小时"
  behind: "慢 {{hours}} 小时"
  same: "与本地同时"
  tomorrow: "明天"
  yesterday: "昨天"
  day: "白天"
  night: "夜间"
en:
  ahead: "+{{hours}}h"
  behind: "−{{hours}}h"
  same: "Same as local"
  tomorrow: "Tomorrow"
  yesterday: "Yesterday"
  day: "Daytime"
  night: "Night"
ja:
  ahead: "{{hours}} 時間進み"
  behind: "{{hours}} 時間遅れ"
  same: "現地と同じ時刻"
  tomorrow: "明日"
  yesterday: "昨日"
  day: "昼間"
  night: "夜間"
`;
const t = createTranslator(messages);

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallTime(now: number, timeZone: string): Wall | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(now);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
    return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
  } catch {
    return null;
  }
}

function offsetHours(now: number, wall: Wall) {
  const zoned = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const local = new Date(now);
  const localWall = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds());
  return Math.round((zoned - localWall) / 900_000) / 4;
}

function offsetLabel(hours: number) {
  if (hours === 0) return t("same");
  const value = Number.isInteger(Math.abs(hours)) ? Math.abs(hours) : Math.abs(hours).toFixed(2).replace(/0$/, "");
  return hours > 0 ? t("ahead", { hours: value }) : t("behind", { hours: value });
}

function dayShift(now: number, wall: Wall) {
  const local = new Date(now);
  const diff = Date.UTC(wall.year, wall.month - 1, wall.day) - Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
  return diff > 0 ? t("tomorrow") : diff < 0 ? t("yesterday") : "";
}

function Clock({ label, timeZone, now }: { label: string; timeZone: string; now: number }) {
  const wall = wallTime(now, timeZone);
  if (!wall) return null;
  const locale = getFormatLocale();
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const date = new Intl.DateTimeFormat(locale, { timeZone, month: "short", day: "numeric", weekday: "short" }).format(now);
  const isDay = wall.hour >= 6 && wall.hour < 18;
  const DayIcon = isDay ? Sun : Moon;
  const shift = dayShift(now, wall);
  return <motion.li className="ai-card-clock" variants={rowVariants} data-night={!isDay || undefined}>
    <span className="ai-card-clock-icon" title={isDay ? t("day") : t("night")}><DayIcon size={16} aria-hidden="true"/></span>
    <span className="ai-card-clock-place">
      <span className="ai-card-clock-label">{label}</span>
      <span className="ai-card-muted">{[shift, date].filter(Boolean).join(" · ")}</span>
    </span>
    <span className="ai-card-clock-time goose-tabular">
      {time}<span className="ai-card-clock-sec">{String(wall.second).padStart(2, "0")}</span>
    </span>
    <span className="ai-card-clock-offset goose-tabular">{offsetLabel(offsetHours(now, wall))}</span>
  </motion.li>;
}

export function WorldTimeCard({ card }: { card: WorldTimeCardData }) {
  useLocale();
  const now = useNow();
  return <ul className="ai-card-clocks">
    {card.entries.map(entry => <Clock key={`${entry.label}-${entry.timeZone}`} label={entry.label} timeZone={entry.timeZone} now={now}/>)}
  </ul>;
}
