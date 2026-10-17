import { useEffect } from "react";
import { ensureReflection, refreshLastWeekEdited } from "@/lib/reflection/reflectionRunner";

const STARTUP_DELAY_MS = 8_000;

/** 启动和窗口获得焦点时刷新上周红点；已授权且 AI 可用时后台预生成「过去 7 天」叙事。失败静默，不自动重试同一键。 */
export function useWeeklyReflection() {
  useEffect(() => {
    let running = false;
    const check = () => {
      if (running) return;
      running = true;
      void refreshLastWeekEdited()
        .then(() => ensureReflection("7d"))
        .catch(() => undefined)
        .finally(() => {
          running = false;
        });
    };
    const timer = window.setTimeout(check, STARTUP_DELAY_MS);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", check);
    };
  }, []);
}
