import { addDays, dayKey, startOfWeek } from "./weekRange";

export type ReflectionScope = "7d" | "30d" | "90d";

export const REFLECTION_SCOPES: ReflectionScope[] = ["7d", "30d", "90d"];
export const DEFAULT_SCOPE: ReflectionScope = "7d";

export interface ScopeRange {
  scope: ReflectionScope;
  key: string;
  start: number;
  end: number;
  days: number;
}

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

export function scheduledReflectionKey(scope: ReflectionScope, now = Date.now()): string {
  return `scheduled:${scope}:${dayKey(reflectionSchedule(scope, now).dueAt)}`;
}

export function scopeRange(scope: ReflectionScope, now = Date.now()): ScopeRange {
  const days = scope === "7d" ? 7 : scope === "30d" ? 30 : 90;
  // Include today and use local calendar boundaries, including across DST changes.
  const end = addDays(now, 1);
  const start = addDays(end, -days);
  return { scope, key: `rolling-v2:${scope}:${dayKey(now)}`, start, end, days };
}
