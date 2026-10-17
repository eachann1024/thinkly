import { DAY_MS, addDays, dayKey, startOfDay } from "./weekRange";
import type { EditEvent } from "./editHistory";
import type { ScopeRange } from "./scopeRange";

export const STALLED_DAYS = 14;
export const MAX_STALLED = 3;
/** 搁置判定的回看窗口与最少编辑次数（与所选范围无关）。 */
export const STALLED_LOOKBACK_DAYS = 60;
export const STALLED_MIN_EDITS = 2;
export const MAX_TOP_NOTES = 5;

export interface TrendPoint {
  /** 该点（天或周）的起始时间。 */
  start: number;
  edits: number;
  added: number;
}

export interface NoteActivity {
  pageId: string;
  edits: number;
  added: number;
  lastAt: number;
}

export interface ReflectionStats {
  total: number;
  added: number;
  notes: number;
  trend: TrendPoint[];
  /** 最活跃的一天（起始时间），无数据为 null。 */
  busiestDay: number | null;
  peakHour: number | null;
  /** 范围内按编辑次数降序的全部笔记。 */
  perNote: NoteActivity[];
  /** 过去 STALLED_LOOKBACK_DAYS 天编辑不少于 STALLED_MIN_EDITS 次、最后一次在 STALLED_DAYS 天前。 */
  stalled: NoteActivity[];
}

function argMax(values: number[]): number | null {
  let best = 0;
  let index: number | null = null;
  values.forEach((v, i) => {
    if (v > best) {
      best = v;
      index = i;
    }
  });
  return index;
}

/** 90 天按周聚合，其余按天。 */
function buildTrend(events: EditEvent[], range: ScopeRange): TrendPoint[] {
  const step = range.days > 31 ? 7 : 1;
  const points: TrendPoint[] = [];
  for (let day = 0; day < range.days; day += step) {
    points.push({ start: addDays(range.start, day), edits: 0, added: 0 });
  }
  for (const e of events) {
    const point = points[Math.min(points.length - 1, Math.floor(Math.round((startOfDay(e.at) - range.start) / DAY_MS) / step))];
    if (!point) continue;
    point.edits += 1;
    point.added += e.added;
  }
  return points;
}

export function computeReflectionStats(
  allEvents: EditEvent[],
  range: ScopeRange,
  now = Date.now(),
): ReflectionStats {
  const events = allEvents.filter((e) => e.at >= range.start && e.at < range.end);
  const dayTotals = new Map<string, { start: number; edits: number }>();
  const hourly = Array<number>(24).fill(0);
  const byNote = new Map<string, NoteActivity>();
  let added = 0;
  for (const e of events) {
    const key = dayKey(e.at);
    const day = dayTotals.get(key) ?? { start: startOfDay(e.at), edits: 0 };
    day.edits += 1;
    dayTotals.set(key, day);
    hourly[new Date(e.at).getHours()] += 1;
    added += e.added;
    const note = byNote.get(e.pageId) ?? { pageId: e.pageId, edits: 0, added: 0, lastAt: 0 };
    note.edits += 1;
    note.added += e.added;
    note.lastAt = Math.max(note.lastAt, e.at);
    byNote.set(e.pageId, note);
  }
  const perNote = [...byNote.values()].sort((a, b) => b.edits - a.edits || b.added - a.added || b.lastAt - a.lastAt);
  const days = [...dayTotals.values()];
  const busiest = argMax(days.map((d) => d.edits));
  const lookbackStart = now - STALLED_LOOKBACK_DAYS * DAY_MS;
  const history = new Map<string, NoteActivity>();
  for (const e of allEvents) {
    if (e.at < lookbackStart) continue;
    const note = history.get(e.pageId) ?? { pageId: e.pageId, edits: 0, added: 0, lastAt: 0 };
    note.edits += 1;
    note.added += e.added;
    note.lastAt = Math.max(note.lastAt, e.at);
    history.set(e.pageId, note);
  }
  const cutoff = now - STALLED_DAYS * DAY_MS;
  const stalled = [...history.values()]
    .filter((n) => n.edits >= STALLED_MIN_EDITS && n.lastAt < cutoff)
    .sort((a, b) => b.edits - a.edits || b.lastAt - a.lastAt)
    .slice(0, MAX_STALLED);
  return {
    total: events.length,
    added,
    notes: perNote.length,
    trend: buildTrend(events, range),
    busiestDay: busiest === null ? null : days[busiest].start,
    peakHour: argMax(hourly),
    perNote,
    stalled,
  };
}
