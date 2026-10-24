import { addDays, dayKey, startOfWeek } from "./weekRange";

export type ReflectionScope = "7d" | "30d" | "90d";

export const REFLECTION_SCOPES: ReflectionScope[] = ["7d", "30d", "90d"];
export const DEFAULT_SCOPE: ReflectionScope = "7d";

export interface ScopeRange {
  scope: ReflectionScope;
  /** 已完成周期的独立缓存键，与旧版滚动范围隔离。 */
  key: string;
  start: number;
  /** 当前周期开始时刻，开区间。 */
  end: number;
  days: number;
}

/** 本地日历周期边界；日期构造器负责跨年、闰月和夏令时。 */
export function reflectionSchedule(scope: ReflectionScope, now = Date.now()) {
  const date = new Date(now);
  if (scope === "7d") {
    const dueAt = startOfWeek(now);
    return { start: addDays(dueAt, -7), dueAt, nextAt: addDays(dueAt, 7) };
  }
  const months = scope === "30d" ? 1 : 3;
  const month = scope === "30d" ? date.getMonth() : Math.floor(date.getMonth() / 3) * 3;
  const at = (offset: number) => new Date(date.getFullYear(), month + offset, 1).getTime();
  return { start: at(-months), dueAt: at(0), nextAt: at(months) };
}

export function scopeRange(scope: ReflectionScope, now = Date.now()): ScopeRange {
  const { start, dueAt: end } = reflectionSchedule(scope, now);
  const a = new Date(start);
  const b = new Date(end);
  const days = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
    - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
  return { scope, key: `scheduled:${scope}:${dayKey(end)}`, start, end, days };
}
