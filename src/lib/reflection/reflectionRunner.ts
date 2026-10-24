import { getAIAvailability } from "@/lib/ai-provider";
import { getLocale } from "@/i18n/runtime";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { loadEditEvents } from "./editHistory";
import { generateReflection } from "./generateReflection";
import { computeReflectionStats, type ReflectionStats } from "./reflectionStats";
import { scopeRange, type ReflectionScope, type ScopeRange } from "./scopeRange";
import { STALLED_LOOKBACK_DAYS } from "./reflectionStats";
import { DAY_MS, previousWeek } from "./weekRange";

export interface ReflectionData {
  range: ScopeRange;
  stats: ReflectionStats;
}

export async function loadReflectionData(scope: ReflectionScope, force = false): Promise<ReflectionData> {
  const range = scopeRange(scope);
  const since = Math.min(range.start, Date.now() - STALLED_LOOKBACK_DAYS * DAY_MS);
  const events = await loadEditEvents(since, force);
  return { range, stats: computeReflectionStats(events, range) };
}

export function isReflectionAIReady() {
  return getAIAvailability(useSettings.getState().ai).ok;
}

export async function ensureReflection(
  scope: ReflectionScope,
  options: { force?: boolean; data?: ReflectionData } = {},
): Promise<boolean> {
  const store = useReflection.getState();
  const aiEnabled = useSettings.getState().ai.enabled;
  if (store.generatingKey || !isReflectionAiConsented(store, aiEnabled) || !isReflectionAIReady()) return false;
  if (!options.force) {
    const cached = useReflection.getState();
    const key = scopeRange(scope).key;
    if (cached.reports[key] || cached.failure?.key === key) return false;
  }
  const { range, stats } = options.data ?? (await loadReflectionData(scope));
  if (stats.total === 0) return false;
  const current = useReflection.getState();
  if (!options.force && (current.reports[range.key] || current.failure?.key === range.key)) return false;
  if (useReflection.getState().generatingKey) return false;
  useReflection.getState().setGenerating(range.key);
  try {
    const narrative = await generateReflection(
      useSettings.getState().ai,
      usePages.getState().pages,
      range,
      stats,
      getLocale(),
    );
    useReflection.getState().saveReport(range.key, { ...narrative, generatedAt: Date.now() });
    useReflection.getState().setGenerating(null);
    return true;
  } catch (error) {
    useReflection
      .getState()
      .setFailed(range.key, error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function refreshLastWeekEdited(): Promise<void> {
  const week = previousWeek();
  const events = await loadEditEvents(week.start);
  const edited = events.some((e) => e.at >= week.start && e.at < week.end);
  useReflection.getState().setLastWeekEditedKey(edited ? week.key : null);
}
