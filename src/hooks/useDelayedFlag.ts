import { useEffect, useState } from "react";

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
