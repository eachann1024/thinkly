import { useEffect, useState } from "react";

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
