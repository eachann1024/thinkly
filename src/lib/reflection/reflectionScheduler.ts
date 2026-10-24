import { useSettings } from "@/stores/useSettings";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { ensureReflection, isReflectionAIReady, loadReflectionData } from "./reflectionRunner";
import { REFLECTION_SCOPES, scopeRange } from "./scopeRange";

let running = false;

/** 依次生成最近完成的周／月／季度，避免共用生成锁时遗漏其它周期。 */
export async function runScheduledReflections(): Promise<void> {
  if (running || !useReflection.persist.hasHydrated()) return;
  const store = useReflection.getState();
  if (!isReflectionAiConsented(store, useSettings.getState().ai.enabled) || !isReflectionAIReady()) return;
  running = true;
  try {
    for (const scope of REFLECTION_SCOPES) {
      const current = useReflection.getState();
      if (current.generatingKey) return;
      const key = scopeRange(scope).key;
      if (current.scheduledKeys[scope] === key) continue;
      if (current.reports[key]) {
        current.markScheduled(scope, key);
        continue;
      }
      const data = await loadReflectionData(scope);
      // 读取期间恰好跨周期时留给下次检查，避免完成标记和报告错位。
      if (data.range.key !== key) continue;
      if (data.stats.total === 0) {
        useReflection.getState().markScheduled(scope, key);
        continue;
      }
      const generated = await ensureReflection(scope, { data });
      if (generated || useReflection.getState().failure?.key === key) {
        useReflection.getState().markScheduled(scope, key);
      }
    }
  } finally {
    running = false;
  }
}
