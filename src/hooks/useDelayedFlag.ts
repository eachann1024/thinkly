import { useEffect, useState } from "react";

/** 状态持续 delay 毫秒后才返回 true；快速完成的加载不闪出占位。 */
export function useDelayedFlag(active: boolean, delay = 180): boolean {
  const [shown, setShown] = useState(false);
  if (!active && shown) setShown(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);
  return active && shown;
}
