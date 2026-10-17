const DAY_MS = 86_400_000;

export interface WeekRange {
  /** 周一 00:00（本地时间）的日期键，YYYY-MM-DD。 */
  key: string;
  start: number;
  /** 下周一 00:00，开区间。 */
  end: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hourBucketKey(ts: number): string {
  return `${dayKey(ts)}-${pad(new Date(ts).getHours())}`;
}

/** 本地时间 ts 所在周的周一 00:00。 */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const sinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

export function weekRangeFromStart(start: number): WeekRange {
  return { key: dayKey(start), start, end: addDays(start, 7) };
}

export function currentWeek(now = Date.now()): WeekRange {
  return weekRangeFromStart(startOfWeek(now));
}

/** 上一周（周一到周日）。 */
export function previousWeek(now = Date.now()): WeekRange {
  return weekRangeFromStart(addDays(startOfWeek(now), -7));
}

/** 以 anchorStart 所在周为末尾的连续 count 周，旧到新。 */
export function trailingWeeks(anchorStart: number, count: number): WeekRange[] {
  return Array.from({ length: count }, (_, i) =>
    weekRangeFromStart(addDays(anchorStart, (i - count + 1) * 7)),
  );
}

export { DAY_MS };
