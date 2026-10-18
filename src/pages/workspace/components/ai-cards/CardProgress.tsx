import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CARD_SPRING } from "./cardMotion";

/** 细进度条：填充以弹簧缩放，0–1。 */
export function CardProgress({ value, tone }: { value: number; tone?: "success" | "accent" }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  return <span className="ai-card-progress" data-tone={tone ?? (clamped >= 1 ? "success" : "accent")} role="progressbar"
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
    <motion.span className="ai-card-progress-fill" style={{ originX: 0 }} initial={reduce ? false : { scaleX: 0 }}
      animate={{ scaleX: clamped }} transition={reduce ? { duration: 0 } : CARD_SPRING}/>
  </span>;
}

/** 圆环进度：stroke-dashoffset 随值收拢，用于计时器。 */
export function CardRing({ value, size = 96, stroke = 5, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return <span className="ai-card-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth={stroke}/>
      <circle className="ai-card-ring-arc" cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
    </svg>
    <span className="ai-card-ring-label">{children}</span>
  </span>;
}
