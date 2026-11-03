import { useCallback, useEffect, useMemo, useState } from "react";
import { getAIAvailability, type AISettingsLike } from "@/lib/ai-provider";
import { reflectionAction } from "@/lib/reflection/reflectionActions";
import { loadReflectionData, type ReflectionData } from "@/lib/reflection/reflectionRunner";
import { DEFAULT_SCOPE, scopeRange, type ReflectionScope } from "@/lib/reflection/scopeRange";
import { isReflectionAiConsented, type ReflectionReport } from "@/stores/useReflection";
import { requestMainSnapshot, useMainSnapshot } from "@/windows/data/mainSnapshot";
import type {
  ReflectionPage,
  ReflectionSettingsSnapshot,
  ReflectionSnapshot,
} from "@/windows/data/reflectionSnapshot";
import type { NarrativeState } from "@/pages/workspace/components/sidebar/reflection/ReflectionNarrative";

function useReflectionStats(scope: ReflectionScope) {
  const [data, setData] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadReflectionData(scope).then(
      (next) => {
        if (cancelled) return;
        setData(next);
        setLoading(false);
      },
      () => {
        if (!cancelled) setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [scope, nonce]);
  return { data: data?.range.scope === scope ? data : null, loading, reload: () => setNonce((value) => value + 1) };
}

/** The detail is the action. The main window runs it and the snapshot value is unused. */
function askMain(type: "ensure" | "refresh", scope: ReflectionScope, data?: ReflectionData) {
  void requestMainSnapshot("reflection-action", 2, reflectionAction(type, scope, data)).catch(() => undefined);
}

export function useReflectionWindowModel() {
  const [scope, setScope] = useState<ReflectionScope>(DEFAULT_SCOPE);
  const reflection = useMainSnapshot<ReflectionSnapshot>("reflection");
  const settings = useMainSnapshot<ReflectionSettingsSnapshot>("settings");
  const pages = useMainSnapshot<Record<string, ReflectionPage>>("pages");
  const stats = useReflectionStats(scope);

  const ai = settings.data?.ai;
  const aiReady = useMemo(() => Boolean(ai && getAIAvailability(ai as AISettingsLike).ok), [ai]);
  const store = reflection.data;
  const consented = store ? isReflectionAiConsented(store, Boolean(ai?.enabled)) : false;
  const key = stats.data?.range.key ?? scopeRange(scope).key;
  const report: ReflectionReport | undefined = store?.reports[key];
  const generating = store?.generatingKey === key;
  const failed = store?.failure?.key === key && !report;

  useEffect(() => {
    if (!stats.data || stats.data.stats.total === 0 || !consented || !aiReady || report || generating || failed) return;
    askMain("ensure", scope, stats.data);
  }, [stats.data, consented, aiReady, report, generating, failed, scope]);

  let state: NarrativeState = "ready";
  if (settings.ready && !aiReady) state = "notConfigured";
  else if (reflection.ready && !consented) state = "needsConsent";
  else if (generating) state = "generating";
  else if (failed) state = "failed";

  return {
    scope,
    setScope,
    data: stats.data,
    loading: stats.loading,
    pages: pages.data ?? {},
    state,
    report,
    failureMessage: failed ? store?.failure?.message : undefined,
    generating,
    consented,
    aiReady,
    refresh: () => {
      stats.reload();
      reflection.refresh();
      askMain("refresh", scope);
    },
    enable: () => {
      if (stats.data) askMain("ensure", scope, stats.data);
    },
    refreshSnapshots: useCallback(() => {
      reflection.refresh();
      settings.refresh();
    }, [reflection, settings]),
  };
}
