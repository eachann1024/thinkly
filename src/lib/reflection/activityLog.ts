import { addDays, dayKey, hourBucketKey, startOfWeek } from "./weekRange";

export const ACTIVITY_RETENTION_WEEKS = 8;
export const EDIT_DEDUPE_MS = 60_000;

export interface ActivityLog {
  /** "YYYY-MM-DD-HH" -> 编辑次数 */
  buckets: Record<string, number>;
  /** "YYYY-MM-DD" -> 当天编辑过的页面 id */
  pages: Record<string, string[]>;
}

export const EMPTY_ACTIVITY: ActivityLog = { buckets: {}, pages: {} };

const lastEditAt = new Map<string, number>();

/** 同一页面 1 分钟内的多次编辑只计一次。 */
export function shouldCountEdit(pageId: string, now: number): boolean {
  const last = lastEditAt.get(pageId);
  if (last !== undefined && now - last < EDIT_DEDUPE_MS) return false;
  lastEditAt.set(pageId, now);
  return true;
}

export function appendEdit(log: ActivityLog, pageId: string, now: number): ActivityLog {
  const bucket = hourBucketKey(now);
  const day = dayKey(now);
  const dayPages = log.pages[day] ?? [];
  const next: ActivityLog = {
    buckets: { ...log.buckets, [bucket]: (log.buckets[bucket] ?? 0) + 1 },
    pages: dayPages.includes(pageId)
      ? log.pages
      : { ...log.pages, [day]: [...dayPages, pageId] },
  };
  return pruneActivity(next, now);
}

/** 只保留最近 ACTIVITY_RETENTION_WEEKS 周（日期键按字典序即时间序）。 */
export function pruneActivity(log: ActivityLog, now: number): ActivityLog {
  const cutoff = dayKey(addDays(startOfWeek(now), -(ACTIVITY_RETENTION_WEEKS - 1) * 7));
  const keepBucket = (k: string) => k.slice(0, 10) >= cutoff;
  const bucketKeys = Object.keys(log.buckets);
  const pageKeys = Object.keys(log.pages);
  if (bucketKeys.every(keepBucket) && pageKeys.every((k) => k >= cutoff)) return log;
  return {
    buckets: Object.fromEntries(Object.entries(log.buckets).filter(([k]) => keepBucket(k))),
    pages: Object.fromEntries(Object.entries(log.pages).filter(([k]) => k >= cutoff)),
  };
}
