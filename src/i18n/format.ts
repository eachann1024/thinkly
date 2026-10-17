import { getFormatLocale, getLocale } from "./runtime";

/** Regional formatting is deliberately independent of the interface language. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getFormatLocale(), options).format(value);
}

export function formatDecimal(value: number, digits: number): string {
  return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const elapsed = Math.max(0, now - timestamp);
  const minute = 60_000, hour = minute * 60, day = hour * 24;
  const relative = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  if (elapsed < minute) return relative.format(0, "second");
  if (elapsed < hour) return relative.format(-Math.floor(elapsed / minute), "minute");
  if (elapsed < day) return relative.format(-Math.floor(elapsed / hour), "hour");
  if (elapsed < day * 7) return relative.format(-Math.floor(elapsed / day), "day");
  return new Date(timestamp).toLocaleDateString(getFormatLocale(), { month: "short", day: "numeric" });
}
