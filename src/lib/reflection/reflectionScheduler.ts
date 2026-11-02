import { useSettings } from "@/stores/useSettings";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { ensureReflection, isReflectionAIReady, loadReflectionData } from "./reflectionRunner";
import { REFLECTION_SCOPES, scheduledReflectionKey, scopeRange, type ReflectionScope } from "./scopeRange";

let running = false;
const failedKeys = new Map<ReflectionScope, string>();

export async function runScheduledReflections(): Promise<void> {
  if (running || !useReflection.persist.hasHydrated()) return;
  const store = useReflection.getState();
  if (!isReflectionAiConsented(store, useSettings.getState().ai.enabled) || !isReflectionAIReady()) return;
  running = true;
  try {
    for (const scope of REFLECTION_SCOPES) {
      const current = useReflection.getState();
      if (current.generatingKey) return;
      const now = Date.now();
      const key = scopeRange(scope, now).key;
      const scheduleKey = scheduledReflectionKey(scope, now);
      // A completion marker alone must not hide a missing or evicted report.
      if (current.scheduledKeys[scope] === scheduleKey && current.reports[key]) continue;
      if (current.reports[key]) {
        current.markScheduled(scope, scheduleKey);
        continue;
      }
      // Each scope retains its failure even when another scope replaces the UI failure state.
      // Retry on the next schedule or app launch; manual refresh remains available.
      if (failedKeys.get(scope) === key) continue;
      const data = await loadReflectionData(scope);
      if (data.range.key !== key) continue;
      if (data.stats.total === 0) {
        useReflection.getState().markScheduled(scope, scheduleKey);
        continue;
      }
      const generated = await ensureReflection(scope, { data });
      if (!generated && useReflection.getState().failure?.key === key) failedKeys.set(scope, key);
      if (generated || useReflection.getState().failure?.key === key) {
        useReflection.getState().markScheduled(scope, scheduleKey);
      }
    }
  } finally {
    running = false;
  }
}
