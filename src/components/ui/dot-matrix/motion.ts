import type { CSSProperties } from "react";

/**
 * 缺省图动效规范：缓慢、无限循环、极其克制——扫一眼像静止，细看才发现在动。
 * dot-matrix.css 中的默认值与此处一一对应，改动时两边同步。
 */
export const DOT_MOTION = {
  /** 首次进入视口一次性聚合显现；最后一环结束时间 ≤ maxMs。 */
  entry: {
    durationMs: 360,
    staggerMs: 28,
    maxIndex: 8,
    maxMs: 600,
    fromScale: 0.985,
  },
  /** 循环周期（秒）。静态插画 6–14s，进行中状态 3–5s。 */
  period: {
    breathe: 12,
    ripple: 12,
    glint: 9,
    flow: 10,
    wave: 10,
    progress: 4,
  },
  /** 静态插画幅度：主图 0.65px、小图 0.35px，缩放上限 1.006。 */
  amplitude: {
    opacityMin: 0.9,
    opacityMax: 1,
    translatePx: 0.65,
    scaleMin: 1,
    scaleMax: 1.006,
  },
  /** 错误态：一次小于 1px 的短促反馈，再转入缓慢循环。 */
  alert: { durationMs: 280, translatePx: 0.8 },
  /** 正弦近似的 ease-in-out。 */
  easing: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

/**
 * 循环语义：
 * - breathe 光晕缓慢呼吸（透明度 1 ↔ 0.9）
 * - ripple 点阵波纹按环错峰（透明度 1 ↔ 0.9）
 * - glint 品牌蓝点偶尔微亮（透明度 0.92–0.96，缩放至 1.006）
 * - flow 提交图节点沿路径慢慢流过
 * - wave 波浪慢慢起伏（translateY ±0.35px）
 * - progress 加载／同步等进行中状态（3–5s）
 * - alert 错误：一次 280ms、最大 0.8px 横向反馈，之后转为 breathe
 */
export type DotLoop =
  | "breathe"
  | "ripple"
  | "glint"
  | "flow"
  | "wave"
  | "progress"
  | "alert";

/** 入场环序号，超过 maxIndex 的环并入最后一环，保证 ≤600ms。 */
export const entryIndex = (i: number) =>
  Math.max(0, Math.min(DOT_MOTION.entry.maxIndex, Math.round(i)));

/** 波纹按环错峰的默认相位步长（秒），避免所有环同时变化。 */
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
  // Negative delay positions every loop inside its cycle on the first visible frame.
  style["--dm-delay"] = `${(phase === 0 ? -cycle : phase - cycle).toFixed(3)}s`;
  if (period != null) style["--dm-period"] = `${period}s`;
  if (loop === "alert")
    style["--dm-alert-delay"] = `${Math.max(0, delay ?? 0.4).toFixed(3)}s`;
  return style as CSSProperties;
}
