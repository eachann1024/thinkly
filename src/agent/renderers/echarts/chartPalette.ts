
export const PALETTE = [
  "#4f46e5",
  "#0d9488",
  "#ea580c",
  "#7c3aed",
  "#0284c7",
  "#db2777",
  "#ca8a04",
  "#059669",
];

export const PALETTE_DARK = [
  "#818cf8",
  "#2dd4bf",
  "#fb923c",
  "#a78bfa",
  "#38bdf8",
  "#f472b6",
  "#fbbf24",
  "#34d399",
];

export const HEATMAP_LIGHT = ["#eef2ff", "#818cf8", "#4f46e5", "#312e81"];
export const HEATMAP_DARK = ["#1e1b4b", "#6366f1", "#a5b4fc", "#e0e7ff"];

export function getPalette(isDark: boolean): string[] {
  return isDark ? PALETTE_DARK : PALETTE;
}

export function getSeriesColor(index: number, isDark: boolean): string {
  const palette = getPalette(isDark);
  return palette[index % palette.length]!;
}

export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(79,70,229,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
