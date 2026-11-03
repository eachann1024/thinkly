import { loadEditEvents } from "@/lib/reflection/editHistory";
import { parseReflectionRecordQuery } from "@/lib/reflection/reflectionRecord";
import { computeReflectionStats, STALLED_LOOKBACK_DAYS } from "@/lib/reflection/reflectionStats";
import { scopeRange } from "@/lib/reflection/scopeRange";
import { DAY_MS } from "@/lib/reflection/weekRange";
import type { ReflectionData } from "@/lib/reflection/reflectionRunner";

/** Read this window's edit activity. Call it only from the main window. */
export async function readReflectionRecord(detail: unknown): Promise<ReflectionData | null> {
  const query = parseReflectionRecordQuery(detail);
  if (!query) return null;
  const range = scopeRange(query.scope);
  const since = Math.min(range.start, Date.now() - STALLED_LOOKBACK_DAYS * DAY_MS);
  const events = await loadEditEvents(since, false, { strict: true });
  return { range, stats: computeReflectionStats(events, range) };
}
