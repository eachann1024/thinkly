import { useEffect } from "react";
import { refreshLastWeekEdited } from "@/lib/reflection/reflectionRunner";
import { runScheduledReflections } from "@/lib/reflection/reflectionScheduler";

const STARTUP_DELAY_MS = 8_000;
const CHECK_INTERVAL_MS = 60_000;

/** 到期生成，启动／唤醒补齐最近周期；不依赖弹窗是否打开。 */
export function useWeeklyReflection() {
  useEffect(() => {
    let running = false;
    const check = () => {
      if (running) return;
      running = true;
      void runScheduledReflections()
        .then(() => refreshLastWeekEdited())
        .catch(() => undefined)
        .finally(() => { running = false; });
    };
    const timer = window.setTimeout(check, STARTUP_DELAY_MS);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, []);
}
