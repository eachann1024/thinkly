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

/** 读取历史（带缓存）并统计；force 时重新读取全部页面的历史。 */
export async function loadReflectionData(scope: ReflectionScope, force = false): Promise<ReflectionData> {
  const range = scopeRange(scope);
  // 「可能搁置」需要 60 天回看，事件窗口取 max(所选范围, 60 天)。
  const since = Math.min(range.start, Date.now() - STALLED_LOOKBACK_DAYS * DAY_MS);
  const events = await loadEditEvents(since, force);
  return { range, stats: computeReflectionStats(events, range) };
}

export function isReflectionAIReady() {
  return getAIAvailability(useSettings.getState().ai).ok;
}

/**
 * 为范围生成并缓存反思。force=false 时已有缓存、未授权、无 AI 或无编辑均不调用。
 * 返回是否写入了新报告。
 */
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

/** 检查上一周（周一到周日）是否有编辑，决定入口红点。 */
export async function refreshLastWeekEdited(): Promise<void> {
  const week = previousWeek();
  const events = await loadEditEvents(week.start);
  const edited = events.some((e) => e.at >= week.start && e.at < week.end);
  useReflection.getState().setLastWeekEditedKey(edited ? week.key : null);
}
