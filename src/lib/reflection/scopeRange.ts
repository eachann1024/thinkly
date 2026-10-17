import { addDays, dayKey, startOfDay } from "./weekRange";

export type ReflectionScope = "7d" | "30d" | "90d";

export const REFLECTION_SCOPES: ReflectionScope[] = ["7d", "30d", "90d"];
export const DEFAULT_SCOPE: ReflectionScope = "7d";

const SCOPE_DAYS: Record<ReflectionScope, number> = { "7d": 7, "30d": 30, "90d": 90 };

export interface ScopeRange {
  scope: ReflectionScope;
  /** 缓存键：范围 + 结束日期。 */
  key: string;
  /** 起始日 00:00。 */
  start: number;
  /** 明天 00:00，开区间。 */
  end: number;
  days: number;
}

export function scopeRange(scope: ReflectionScope, now = Date.now()): ScopeRange {
  const days = SCOPE_DAYS[scope];
  const end = addDays(startOfDay(now), 1);
  return { scope, key: `${scope}:${dayKey(end - 1)}`, start: addDays(end, -days), end, days };
}
