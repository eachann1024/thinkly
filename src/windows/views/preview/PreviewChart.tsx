import { useEffect, useRef, useState } from "react";
import { buildOption, type ChartType, type SimplifiedConfig } from "@/agent/renderers/echarts/chartTheme";
import { getPalette } from "@/agent/renderers/echarts/chartPalette";
import type { FullscreenPreviewPayload } from "@/lib/preview/fullscreenPreviewWindow";

type ChartPayload = Extract<FullscreenPreviewPayload, { kind: "chart" }>;

export function PreviewChart({ payload }: { payload: ChartPayload }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const identity = JSON.stringify([payload.chartType, payload.categories, payload.series, payload.isDark]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let active = true;
    const cleanup = { run: () => {} };
    setFailed(false);
    const cfg: SimplifiedConfig = {
      type: payload.chartType as ChartType,
      categories: payload.categories,
      series: payload.series,
    };
    const option = { color: getPalette(payload.isDark), ...buildOption(cfg, payload.isDark, 1) };
    void (async () => {
      try {
        const { echarts } = await import("@/agent/renderers/echarts/registerEcharts");
        if (!active || !containerRef.current) return;
        const chart = echarts.init(containerRef.current, undefined, { renderer: "svg" });
        chart.setOption(option, { notMerge: true });
        const observer = new ResizeObserver(() => chart.resize());
        observer.observe(containerRef.current);
        cleanup.run = () => {
          observer.disconnect();
          chart.dispose();
        };
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      cleanup.run();
    };
  }, [identity, payload]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-[720px]"
      role="img"
      aria-label={payload.title}
      data-failed={failed || undefined}
    />
  );
}
