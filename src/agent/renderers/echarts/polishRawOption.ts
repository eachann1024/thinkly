import type { EChartsOption } from "echarts";
import { getPalette } from "./chartPalette";
import { readChartTheme } from "./chartThemeTokens";

/**
 * 给原生 ECharts option 注入统一主题色与基础 tooltip（不破坏用户自定义 series）。
 */
export function polishRawOption(
  raw: EChartsOption,
  isDark: boolean,
): EChartsOption {
  const t = readChartTheme(isDark);
  const palette = getPalette(isDark);
  const tooltip = (user: Record<string, unknown> = {}) => ({
    backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderWidth: 1,
    extraCssText: `border-radius:var(--goose-control-radius);box-shadow:${t.tooltipShadow};`,
    ...user,
    textStyle: { color: t.tc, fontSize: 12, fontWeight: 500, ...(user.textStyle as object) },
  });
  const themedComponents = (components: unknown) => {
    if (!components) return components;
    const apply = (component: Record<string, unknown>) => ({ ...component, textStyle: { color: t.sc, ...(component.textStyle as object) } });
    return Array.isArray(components) ? components.map(apply) : apply(components as Record<string, unknown>);
  };
  return {
    ...raw,
    color: raw.color ?? palette,
    backgroundColor: raw.backgroundColor ?? "transparent",
    textStyle: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      color: t.sc,
      ...(raw.textStyle as object),
    },
    legend: themedComponents(raw.legend),
    visualMap: themedComponents(raw.visualMap),
    animation: raw.animation ?? true,
    animationDuration: raw.animationDuration ?? 720,
    animationEasing: raw.animationEasing ?? "cubicOut",
    tooltip: Array.isArray(raw.tooltip)
      ? raw.tooltip.map((user) => tooltip(user as Record<string, unknown>))
      : tooltip(raw.tooltip as Record<string, unknown> | undefined),
  } as EChartsOption;
}
