import { useCallback, useEffect, useRef, useState } from "react";
import type { ReflectionAction } from "@/lib/reflection/reflectionActions";
import { scopeRange } from "@/lib/reflection/scopeRange";
import { requestMainSnapshotResult } from "@/windows/data/mainSnapshot";
import type { ReflectionSnapshot } from "@/windows/data/reflectionSnapshot";

const POLL_MS = 2_000;
const START_GRACE_MS = 10_000;
const OBSERVATION_LIMIT_MS = 5 * 60_000;

interface Observation {
  action?: ReflectionAction;
  key?: string;
  generatedAt?: number;
  failureMessage?: string;
}

/** Observe main-window work even before its first generating snapshot arrives. */
export function useReflectionWindowBridge() {
  const [data, setData] = useState<ReflectionSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [unavailableKey, setUnavailableKey] = useState<string | null>(null);
  const [observation, setObservation] = useState<Observation>({});
  const latest = useRef(data);
  latest.current = data;
  const busy = useRef(false);

  const run = useCallback((action: ReflectionAction) => {
    if (busy.current) return false;
    busy.current = true;
    setUnavailableKey(null);
    const key = action.data?.range.key ?? scopeRange(action.scope).key;
    const snapshot = latest.current;
    setPendingKey(key);
    setObservation({
      action,
      key,
      generatedAt: snapshot?.reports[key]?.generatedAt,
      failureMessage: snapshot?.failure?.key === key ? snapshot.failure.message : undefined,
    });
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let started = false;
    let expectedKey = observation.key;
    let observeUntil = Date.now() + START_GRACE_MS;
    const finish = (unavailable = false) => {
      if (cancelled) return;
      busy.current = false;
      setPendingKey(null);
      if (unavailable && expectedKey) setUnavailableKey(expectedKey);
    };
    const deadline = window.setTimeout(() => {
      finish(true);
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    }, OBSERVATION_LIMIT_MS);
    const poll = async () => {
      const response = await requestMainSnapshotResult<ReflectionSnapshot>("reflection", 1);
      if (cancelled) return;
      setReady(true);
      if (response.ok && response.value) {
        const snapshot = response.value;
        setData(snapshot);
        // Opening a window during an existing run also starts observation.
        expectedKey ??= snapshot.generatingKey ?? undefined;
        if (expectedKey && snapshot.generatingKey === expectedKey) {
          started = true;
          busy.current = true;
          setPendingKey(expectedKey);
        } else if (expectedKey) {
          const report = snapshot.reports[expectedKey];
          const newReport = report && report.generatedAt !== observation.generatedAt;
          const newFailure = snapshot.failure?.key === expectedKey &&
            snapshot.failure.message !== observation.failureMessage;
          if (started || newReport || newFailure) {
            finish();
            window.clearTimeout(deadline);
            return;
          }
        }
        // A no-op (no edits, missing configuration, another scope running) is bounded.
        if (!started && (!observation.action || Date.now() >= observeUntil)) {
          finish(Boolean(observation.action));
          window.clearTimeout(deadline);
          return;
        }
      } else if (!started && Date.now() >= observeUntil) {
        finish(true);
        window.clearTimeout(deadline);
        return;
      }
      timer = window.setTimeout(() => void poll(), POLL_MS);
    };
    void (async () => {
      if (observation.action) {
        // Retries reuse the same request ID; the main host deduplicates them.
        // An unsuccessful acknowledgement can still follow a delivered action.
        await requestMainSnapshotResult("reflection-action", 2, observation.action);
        if (cancelled) return;
        observeUntil = Date.now() + START_GRACE_MS;
      }
      await poll();
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [observation]);

  return { data, ready, pendingKey, unavailableKey, run };
}
