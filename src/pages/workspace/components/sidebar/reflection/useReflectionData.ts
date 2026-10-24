import { useCallback, useEffect, useRef, useState } from "react";
import { loadReflectionData, type ReflectionData } from "@/lib/reflection/reflectionRunner";
import { scopeRange, type ReflectionScope } from "@/lib/reflection/scopeRange";

/** 打开弹窗或切换范围时读取版本历史并统计；reload(true) 强制重读全部历史。 */
export function useReflectionData(open: boolean, scope: ReflectionScope) {
  const [data, setData] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const token = useRef(0);

  const reload = useCallback(
    async (force = false): Promise<ReflectionData | null> => {
      const mine = ++token.current;
      setLoading(true);
      try {
        const next = await loadReflectionData(scope, force);
        if (mine !== token.current) return null;
        setData(next);
        return next;
      } catch {
        return null;
      } finally {
        if (mine === token.current) setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    if (!open) return;
    let key = scopeRange(scope).key;
    void Promise.resolve().then(() => reload(false));
    const timer = window.setInterval(() => {
      const nextKey = scopeRange(scope).key;
      if (nextKey === key) return;
      key = nextKey;
      void reload(false);
    }, 60_000);
    return () => {
      window.clearInterval(timer);
      token.current += 1;
      setLoading(false);
    };
  }, [open, reload]);

  return { data: data?.range.scope === scope ? data : null, loading, reload };
}
