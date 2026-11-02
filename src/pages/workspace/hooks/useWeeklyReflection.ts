import { useEffect } from "react";
import { refreshLastWeekEdited } from "@/lib/reflection/reflectionRunner";
import { runScheduledReflections } from "@/lib/reflection/reflectionScheduler";
import { REFLECTION_SCOPES, reflectionSchedule } from "@/lib/reflection/scopeRange";
import { useSettings } from "@/stores/useSettings";
import { useReflection } from "@/stores/useReflection";

const STARTUP_DELAY_MS = 8_000;
const CHECK_INTERVAL_MS = 60_000;

export function useWeeklyReflection() {
  useEffect(() => {
    let running = false;
    let disposed = false;
    let timer: number;
    const scheduleNext = () => {
      window.clearTimeout(timer);
      const now = Date.now();
      const nextAt = Math.min(...REFLECTION_SCOPES.map((scope) => reflectionSchedule(scope, now).nextAt));
      timer = window.setTimeout(check, Math.max(1, Math.min(CHECK_INTERVAL_MS, nextAt - now)));
    };
    const check = () => {
      if (disposed) return;
      scheduleNext();
      if (running) return;
      running = true;
      void runScheduledReflections()
        .then(() => refreshLastWeekEdited())
        .catch(() => undefined)
        .finally(() => { running = false; });
    };
    const now = Date.now();
    const nextAt = Math.min(...REFLECTION_SCOPES.map((scope) => reflectionSchedule(scope, now).nextAt));
    timer = window.setTimeout(check, Math.min(STARTUP_DELAY_MS, nextAt - now));
    const unsubscribeSettings = useSettings.subscribe((state, previous) => {
      if (state.ai !== previous.ai) check();
    });
    const unsubscribeReflection = useReflection.subscribe((state, previous) => {
      if (state.aiConsent !== previous.aiConsent || state.aiConsentChosen !== previous.aiConsentChosen) check();
    });
    window.addEventListener("focus", check);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unsubscribeSettings();
      unsubscribeReflection();
      window.removeEventListener("focus", check);
    };
  }, []);
}
