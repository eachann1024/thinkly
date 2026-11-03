import { getAIAvailability } from "@/lib/ai-provider";
import type { ReflectionAction } from "@/lib/reflection/reflectionActions";
import { ensureReflection, loadReflectionData } from "@/lib/reflection/reflectionRunner";
import { REFLECTION_SCOPES, type ReflectionScope } from "@/lib/reflection/scopeRange";
import { isReflectionAiConsented, useReflection } from "@/stores/useReflection";
import { useSettings } from "@/stores/useSettings";

const seen = new Set<string>();

function isScope(value: unknown): value is ReflectionScope {
  return REFLECTION_SCOPES.includes(value as ReflectionScope);
}

function parseAction(detail: unknown): ReflectionAction | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const raw = detail as Partial<ReflectionAction>;
  if ((raw.type !== "ensure" && raw.type !== "refresh") || !isScope(raw.scope)) return null;
  if (typeof raw.requestId !== "string" || raw.requestId.length < 1 || raw.requestId.length > 80) return null;
  return { type: raw.type, scope: raw.scope, requestId: raw.requestId, data: raw.data };
}

function run(action: ReflectionAction): void {
  if (seen.has(action.requestId)) return;
  seen.add(action.requestId);
  if (seen.size > 40) {
    const oldest = seen.values().next().value;
    if (oldest) seen.delete(oldest);
  }
  const store = useReflection.getState();
  if (action.type === "ensure" && !isReflectionAiConsented(store, useSettings.getState().ai.enabled)) {
    store.setAiConsent(true);
  }
  if (!getAIAvailability(useSettings.getState().ai).ok) return;
  void (async () => {
    const data = action.type === "refresh" ? await loadReflectionData(action.scope, true) : action.data;
    await ensureReflection(action.scope, { force: action.type === "refresh", data });
  })();
}

/** Runs generation in the main window so closing the reflection window cannot cancel it. */
export function readReflectionAction(detail: unknown): unknown {
  const action = parseAction(detail);
  if (action) run(action);
  return null;
}

export function markReflectionSeen(detail: unknown): unknown {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const weekKey = (detail as { weekKey?: unknown }).weekKey;
  if (typeof weekKey !== "string" || weekKey.length < 1 || weekKey.length > 40) return null;
  useReflection.getState().markSeen(weekKey);
  return null;
}
