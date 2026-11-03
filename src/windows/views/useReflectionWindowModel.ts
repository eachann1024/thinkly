import { useEffect, useMemo, useRef, useState } from "react";
import { getAIAvailability, type AISettingsLike } from "@/lib/ai-provider";
import { reflectionAction } from "@/lib/reflection/reflectionActions";
import { reflectionRecordQuery, type ReflectionRecordStatus } from "@/lib/reflection/reflectionRecord";
import type { ReflectionData } from "@/lib/reflection/reflectionRunner";
import { DEFAULT_SCOPE, REFLECTION_SCOPES, scopeRange, type ReflectionScope } from "@/lib/reflection/scopeRange";
import { isReflectionAiConsented, type ReflectionReport } from "@/stores/useReflection";
import { requestMainSnapshotResult, useMainSnapshot } from "@/windows/data/mainSnapshot";
import { useReflectionWindowBridge } from "./useReflectionWindowBridge";
import type {
  ReflectionPage,
  ReflectionSettingsSnapshot,
} from "@/windows/data/reflectionSnapshot";
import type { NarrativeState } from "@/pages/workspace/components/sidebar/reflection/ReflectionNarrative";

function isReflectionData(value: unknown, scope: ReflectionScope): value is ReflectionData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ReflectionData>;
  const range = data.range;
  const stats = data.stats;
  return Boolean(
    range && range.scope === scope && typeof range.start === "number" && typeof range.end === "number" &&
    stats && typeof stats.total === "number" && Array.isArray(stats.trend) &&
    Array.isArray(stats.perNote) && Array.isArray(stats.stalled),
  );
}

function useReflectionRecord(scope: ReflectionScope) {
  const [data, setData] = useState<ReflectionData | null>(null);
  const [status, setStatus] = useState<ReflectionRecordStatus>("loading");
  const [nonce, setNonce] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    let cancelled = false;
    const kept = dataRef.current?.range.scope === scope ? dataRef.current : null;
    setStatus(kept ? "ready" : "loading");
    setData(kept);
    void requestMainSnapshotResult<ReflectionData>("reflection-record", 2, reflectionRecordQuery(scope)).then((response) => {
      if (cancelled) return;
      if (!response.ok || !isReflectionData(response.value, scope)) {
        setStatus(kept ? "ready" : "unavailable");
        return;
      }
      setData(response.value);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [scope, nonce]);
  return {
    data: data?.range.scope === scope ? data : null,
    status,
    reload: () => setNonce((value) => value + 1),
  };
}

export function useReflectionWindowModel() {
  const [scope, setScope] = useState<ReflectionScope>(DEFAULT_SCOPE);
  const reflection = useReflectionWindowBridge();
  const attemptedKeys = useRef(new Set<string>());
  const settings = useMainSnapshot<ReflectionSettingsSnapshot>("settings");
  const pages = useMainSnapshot<Record<string, ReflectionPage>>("pages");
  const record = useReflectionRecord(scope);

  const ai = settings.data?.ai;
  const aiReady = useMemo(() => Boolean(ai && getAIAvailability(ai as AISettingsLike).ok), [ai]);
  const store = reflection.data;
  const consented = store ? isReflectionAiConsented(store, Boolean(ai?.enabled)) : false;
  const key = record.data?.range.key ?? scopeRange(scope).key;
  const report: ReflectionReport | undefined = store?.reports[key];
  const observationUnavailable = reflection.unavailableKey === key;
  const generating = !observationUnavailable && (store?.generatingKey === key || reflection.pendingKey === key);
  const failed = (store?.failure?.key === key || observationUnavailable) && !report;

  const run = reflection.run;
  useEffect(() => {
    const data = record.data;
    if (!reflection.ready || !data || data.stats.total === 0 || !consented || !aiReady || report || generating || failed) return;
    if (attemptedKeys.current.has(data.range.key)) return;
    if (run(reflectionAction("ensure", scope, data))) attemptedKeys.current.add(data.range.key);
  }, [record.data, reflection.ready, reflection.pendingKey, consented, aiReady, report, generating, failed, scope, run]);

  let state: NarrativeState = "ready";
  if (settings.ready && !aiReady) state = "notConfigured";
  else if (reflection.ready && !consented) state = "needsConsent";
  else if (generating) state = "generating";
  else if (failed) state = "failed";

  return {
    scope,
    setScope: (next: ReflectionScope) => {
      if (REFLECTION_SCOPES.includes(next)) setScope(next);
    },
    data: record.data,
    recordStatus: record.status,
    pages: pages.data ?? {},
    state,
    report,
    failureMessage: failed ? store?.failure?.message : undefined,
    generating,
    consented,
    aiReady,
    refresh: () => {
      record.reload();
      settings.refresh();
      if (run(reflectionAction("refresh", scope))) attemptedKeys.current.add(key);
    },
    enable: () => {
      if (record.data && run(reflectionAction("ensure", scope, record.data))) attemptedKeys.current.add(key);
    },
  };
}
