import { useEffect, useState } from "react";

/** 当前 devicePixelRatio（≥1，四舍五入到 0.25），跨屏或缩放时更新。 */
function read(): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.max(1, Math.round(dpr * 4) / 4);
}

export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(read);
  useEffect(() => {
    const query = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    if (!query) return;
    const update = () => setDpr(read());
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [dpr]);
  return dpr;
}
