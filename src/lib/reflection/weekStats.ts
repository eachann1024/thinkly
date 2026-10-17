import type { Page } from "@/types";
import type { ActivityLog } from "./activityLog";
import { addDays, dayKey, type WeekRange } from "./weekRange";

export const MIN_NOTES_FOR_REFLECTION = 3;
export const MIN_EDITS_FOR_REFLECTION = 5;

export interface WeekStats {
  daily: number[];
  hourly: number[];
  total: number;
  notes: number;
  /** 0 = 周一 … 6 = 周日；无数据为 null。 */
  busiestDay: number | null;
  peakHour: number | null;
  /** 没有分桶记录，由 updatedAt 粗略回填。 */
  approximate: boolean;
}

export function isEditablePage(page: Page): boolean {
  return !page.isFolder && !page.trashedAt && !page.editorDraft && page.id !== "__quicknote_draft__";
}

export function pagesEditedInWeek(pages: Record<string, Page>, week: WeekRange): Page[] {
  return Object.values(pages)
    .filter((p) => isEditablePage(p) && p.updatedAt >= week.start && p.updatedAt < week.end)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function argMax(values: number[]): number | null {
  let best = -1;
  let index: number | null = null;
  values.forEach((v, i) => {
    if (v > best) {
      best = v;
      index = i;
    }
  });
  return best > 0 ? index : null;
}

export function computeWeekStats(
  log: ActivityLog,
  pages: Record<string, Page>,
  week: WeekRange,
): WeekStats {
  const daily = Array<number>(7).fill(0);
  const hourly = Array<number>(24).fill(0);
  const noteIds = new Set<string>();
  const dayKeys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(week.start, i)));
  let recorded = false;
  for (const [key, count] of Object.entries(log.buckets)) {
    const day = dayKeys.indexOf(key.slice(0, 10));
    if (day < 0) continue;
    recorded = true;
    daily[day] += count;
    hourly[Number(key.slice(11))] += count;
  }
  if (recorded) {
    for (const day of dayKeys) {
      for (const id of log.pages[day] ?? []) {
        if (pages[id] && isEditablePage(pages[id])) noteIds.add(id);
      }
    }
  } else {
    for (const page of pagesEditedInWeek(pages, week)) {
      noteIds.add(page.id);
      daily[dayKeys.indexOf(dayKey(page.updatedAt))] += 1;
      hourly[new Date(page.updatedAt).getHours()] += 1;
    }
  }
  const total = daily.reduce((a, b) => a + b, 0);
  return {
    daily,
    hourly,
    total,
    notes: noteIds.size,
    busiestDay: argMax(daily),
    peakHour: argMax(hourly),
    approximate: !recorded && total > 0,
  };
}

export function isReflectionEligible(stats: WeekStats): boolean {
  return stats.notes >= MIN_NOTES_FOR_REFLECTION && stats.total >= MIN_EDITS_FOR_REFLECTION;
}
