import { useLocale, getFormatLocale } from "@/i18n";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Minus } from "@/components/ui/icons";
import type { StatsCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { rowVariants, useCountUp } from "./cardMotion";
import "./ai-cards-info.css";

type Stat = StatsCardData["stats"][number];
type ParsedValue = { prefix: string; number: number; decimals: number; grouped: boolean; suffix: string };

function parseValue(raw: string): ParsedValue | null {
  const match = /^(\D*?)([-+−]?\d[\d,]*(?:\.\d+)?)(.*)$/u.exec(raw.trim());
  if (!match) return null;
  const digits = match[2].replace(/,/g, "").replace("−", "-");
  const number = Number(digits);
  if (!Number.isFinite(number)) return null;
  return { prefix: match[1], number, decimals: digits.split(".")[1]?.length ?? 0, grouped: match[2].includes(","), suffix: match[3] };
}

function formatParsed(parsed: ParsedValue, value: number) {
  const body = parsed.grouped
    ? new Intl.NumberFormat(getFormatLocale(), { minimumFractionDigits: parsed.decimals, maximumFractionDigits: parsed.decimals }).format(value)
    : value.toFixed(parsed.decimals);
  return `${parsed.prefix}${body}${parsed.suffix}`;
}

function trendOf(stat: Stat): "up" | "down" | "flat" | undefined {
  if (stat.trend) return stat.trend;
  if (!stat.delta) return undefined;
  const head = stat.delta.trim()[0];
  return head === "+" ? "up" : head === "-" || head === "−" ? "down" : undefined;
}

const TREND_ICON = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;

function StatTile({ stat }: { stat: Stat }) {
  const parsed = parseValue(stat.value);
  const current = useCountUp(parsed ? parsed.number : Number.NaN, { from: parsed ? parsed.number * 0.4 : undefined });
  const trend = trendOf(stat);
  const TrendIcon = trend ? TREND_ICON[trend] : null;
  return <motion.li className="ai-stat" variants={rowVariants}>
    <span className="ai-stat-label">{stat.label}</span>
    <span className="ai-stat-value goose-tabular" aria-label={stat.value}>{parsed ? formatParsed(parsed, current) : stat.value}</span>
    {stat.delta && <span className="ai-stat-delta goose-tabular" data-trend={trend}>
      {TrendIcon && <TrendIcon size={12} aria-hidden="true"/>}{stat.delta}
    </span>}
  </motion.li>;
}

export function StatsCard({ card }: { card: StatsCardData }) {
  useLocale();
  return <ul className="ai-stats" data-count={Math.min(card.stats.length, 4)}>
    {card.stats.map((stat, index) => <StatTile key={`${index}-${stat.label}`} stat={stat}/>)}
  </ul>;
}
