import { echarts } from "./registerEcharts";
import { hexToRgba } from "./chartPalette";

function verticalGradient(
  top: string,
  bottom: string,
): echarts.graphic.LinearGradient {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: top },
    { offset: 1, color: bottom },
  ]);
}

export function areaGradient(hex: string): echarts.graphic.LinearGradient {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: hexToRgba(hex, 0.32) },
    { offset: 0.55, color: hexToRgba(hex, 0.1) },
    { offset: 1, color: hexToRgba(hex, 0.02) },
  ]);
}

export function barGradient(
  hex: string,
  isDark: boolean,
): echarts.graphic.LinearGradient {
  if (isDark) {
    return verticalGradient(hexToRgba(hex, 1), hexToRgba(hex, 0.72));
  }
  return verticalGradient(hex, hexToRgba(hex, 0.82));
}
