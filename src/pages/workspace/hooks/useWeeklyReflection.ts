import { useEffect } from "react";
import { ensureLastWeekReflection } from "@/lib/reflection/reflectionRunner";
import { previousWeek } from "@/lib/reflection/weekRange";
import { useReflection } from "@/stores/useReflection";

const STARTUP_DELAY_MS = 15_000;

/** 启动和窗口获得焦点时检查是否有待生成的上周反思；同一周失败后本次会话不再自动重试。 */
export function useWeeklyReflection() {
  useEffect(() => {
    const failedKeys = new Set<string>();
    const check = () => {
      const key = previousWeek().key;
      if (failedKeys.has(key) || useReflection.getState().reports[key]) return;
      void ensureLastWeekReflection().then(() => {
        if (useReflection.getState().error) failedKeys.add(key);
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
