import { useEffect, useRef, useState, type RefObject } from "react";
import type { EChartsType, EChartsCoreOption } from "echarts/core";

export function useChartRenderer(container: RefObject<HTMLDivElement | null>, option: EChartsCoreOption | null) {
  const chart = useRef<EChartsType | null>(null);
  const [rendered, setRendered] = useState<{ option: EChartsCoreOption | null; status: "ready" | "failed" } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setRendered(null);
    if (!option) {
      chart.current?.dispose();
      chart.current = null;
      return;
    }
    void (async () => {
      try {
        const { echarts } = await import("@/agent/renderers/echarts/registerEcharts");
        if (!active || !container.current) return;
        chart.current ??= echarts.init(container.current, undefined, { renderer: "svg" });
        chart.current.setOption(option, { notMerge: true });
        setRendered({ option, status: "ready" });
      } catch {
        if (active) setRendered({ option, status: "failed" });
      }
    })();
    return () => { active = false; };
  }, [option, revision, container]);
  useEffect(() => {
    const resize = () => chart.current?.resize();
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    if (container.current) observer?.observe(container.current);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, [container]);
  return { chart, status: rendered?.option === option ? rendered.status : "loading", retry: () => setRevision(value => value + 1) };
}
