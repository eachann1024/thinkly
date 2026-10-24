import { readThemeSurfaceSnapshot } from "@/lib/themeSurfaceSnapshot";

export function readChartTheme(_isDark: boolean) {
  const theme = readThemeSurfaceSnapshot();
  return {
    bg: theme.background, tc: theme.foreground, sc: theme.secondary,
    muted: theme.secondary, gl: theme.border, glStrong: theme.border,
    tooltipBg: theme.background, tooltipBorder: theme.border,
    tooltipShadow: "var(--goose-floating-shadow, 0 8px 24px rgba(0,0,0,0.12))",
    axisPointer: theme.hover, pieBorder: theme.background,
  };
}
