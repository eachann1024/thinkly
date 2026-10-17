import { getAIAvailability } from "@/lib/ai-provider";
import { getLocale } from "@/i18n/runtime";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useReflection } from "@/stores/useReflection";
import { generateReflection } from "./generateReflection";
import { previousWeek } from "./weekRange";
import { computeWeekStats, isReflectionEligible } from "./weekStats";

/** 上周统计（本地，不涉及 AI）。 */
export function getLastWeekSnapshot(now = Date.now()) {
  const week = previousWeek(now);
  const { activity } = useReflection.getState();
  const stats = computeWeekStats(activity, usePages.getState().pages, week);
  return { week, stats, eligible: isReflectionEligible(stats) };
}

export function isReflectionAIReady() {
  return getAIAvailability(useSettings.getState().ai).ok;
}

/**
 * 为上周生成并缓存反思。force=false 时已有缓存、未授权、无 AI 或活动不足均不调用。
 * 返回是否写入了新报告。
 */
export async function ensureLastWeekReflection(force = false): Promise<boolean> {
  const store = useReflection.getState();
  if (store.generatingKey) return false;
  const { week, stats, eligible } = getLastWeekSnapshot();
  if (!eligible || !store.aiConsent || !isReflectionAIReady()) return false;
  if (!force && store.reports[week.key]) return false;
  store.setGenerating(week.key);
  try {
    const narrative = await generateReflection(
      useSettings.getState().ai,
      usePages.getState().pages,
      week,
      stats,
      getLocale(),
    );
    useReflection.getState().saveReport(week.key, { ...narrative, generatedAt: Date.now() });
    useReflection.getState().setGenerating(null);
    return true;
  } catch (error) {
    useReflection
      .getState()
      .setGenerating(null, error instanceof Error ? error.message : String(error));
    return false;
  }
}
