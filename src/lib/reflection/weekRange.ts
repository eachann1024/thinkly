const DAY_MS = 86_400_000;

export interface WeekRange {
  key: string;
  start: number;
  end: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

export function previousWeek(now = Date.now()): WeekRange {
  return weekRangeFromStart(addDays(startOfWeek(now), -7));
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export { DAY_MS };
