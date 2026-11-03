import { getFormatLocale, getLocale } from "@/i18n/runtime";

const DAY_MS = 86_400_000;

function calendarDayNumber(ts: number): number {
  const date = new Date(ts);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole local calendar days from earlier to later. DST-safe. */
export function calendarDayDiff(later: number, earlier: number): number {
  return Math.round((calendarDayNumber(later) - calendarDayNumber(earlier)) / DAY_MS);
}

/** Today, tomorrow, or a future day count in the active locale. */
export function formatDaysUntil(target: number, now = Date.now()): string {
  const days = calendarDayDiff(target, now);
  return new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" }).format(days, "day");
}

/** Inclusive range. Same year keeps the year on the start only. */
export function formatScopeSpan(start: number, endInclusive: number): string {
  const locale = getFormatLocale();
  const from = new Date(start);
  const to = new Date(endInclusive);
  const full = new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" });
  if (from.getFullYear() === to.getFullYear()) {
    const short = new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" });
    return `${full.format(from)} – ${short.format(to)}`;
  }
  return `${full.format(from)} – ${full.format(to)}`;
}
