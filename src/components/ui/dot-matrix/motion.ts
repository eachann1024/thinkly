import type { CSSProperties } from "react";

export const DOT_MOTION = {
  entry: {
    durationMs: 360,
    staggerMs: 28,
    maxIndex: 8,
    maxMs: 600,
    fromScale: 0.985,
  },
  period: {
    breathe: 12,
    ripple: 12,
    glint: 9,
    flow: 10,
    wave: 10,
    progress: 4,
  },
  amplitude: {
    opacityMin: 0.9,
    opacityMax: 1,
    translatePx: 0.65,
    scaleMin: 1,
    scaleMax: 1.006,
  },
  alert: { durationMs: 280, translatePx: 0.8 },
  easing: "cubic-bezier(0.45, 0, 0.55, 1)",
  loopEasing: "steps(2, end)",
} as const;

export type DotLoop =
  | "breathe"
  | "ripple"
  | "glint"
  | "flow"
  | "wave"
  | "progress"
  | "alert";

export const entryIndex = (i: number) =>
  Math.max(0, Math.min(DOT_MOTION.entry.maxIndex, Math.round(i)));

export const rippleDelay = (
  ring: number,
  rings: number,
  period: number = DOT_MOTION.period.ripple,
) => (ring / Math.max(1, rings)) * period * 0.45;

export function loopVars({
  delay,
  period,
  loop,
}: {
  delay?: number;
  period?: number;
  loop?: DotLoop;
}) {
  const style: Record<string, string> = {};
  const cycle =
    period ??
    DOT_MOTION.period[loop === "alert" ? "breathe" : (loop ?? "breathe")];
  const phase = (((delay ?? 0) % cycle) + cycle) % cycle;
  style["--dm-delay"] = `${(phase === 0 ? -cycle : phase - cycle).toFixed(3)}s`;
  if (period != null) style["--dm-period"] = `${period}s`;
  if (loop === "alert")
    style["--dm-alert-delay"] = `${Math.max(0, delay ?? 0.4).toFixed(3)}s`;
  return style as CSSProperties;
}
