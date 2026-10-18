import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

/** 卡片/设备入场：18 帧，scale .92 → 1。 */
export const EASE_CARD = Easing.bezier(0.22, 1, 0.36, 1);
/** 底色切换：12 帧交叉淡化。 */
export const EASE_BG = Easing.bezier(0.65, 0, 0.35, 1);
/** 文本 spring：damping 200 / stiffness 120 / mass .6。 */
export const TEXT_SPRING = { damping: 200, stiffness: 120, mass: 0.6 };
/** 强调物件落位：2° 过冲。 */
export const STAMP_SPRING = { damping: 12, stiffness: 300 };

export function textSpring(frame: number, delay = 0) {
  return spring({ frame: Math.max(0, frame - delay), fps: FPS, config: TEXT_SPRING });
}

export function riseIn(frame: number, delay = 0, distance = 40) {
  const p = textSpring(frame, delay);
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

export function cardIn(frame: number, delay = 0, duration = 18) {
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return { opacity: p, transform: `scale(${0.92 + 0.08 * p})` };
}

/** 飞入：18 帧，X 位移 + scale，绝不旋转入场。 */
export function flyIn(frame: number, delay = 0, distance = 180, duration = 18) {
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return {
    opacity: Math.min(1, p * 1.6),
    transform: `translateX(${(1 - p) * distance}px) scale(${0.92 + 0.08 * p})`,
  };
}

/** 升起：从下方 40–64px 上浮。 */
export function liftIn(frame: number, delay = 0, distance = 56) {
  const p = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

/** 塌缩：主体收拢，14 帧。 */
export function collapseAt(frame: number, delay = 0, origin = "0% 50%", duration = 14) {
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
  return {
    opacity: 1 - p,
    transform: `scaleX(${1 - 0.94 * p}) scaleY(${1 - 0.35 * p})`,
    transformOrigin: origin,
  };
}

export function fadeColor(frame: number, start: number, duration = 12) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_BG,
  });
}

/** 强调物件落位：2° 过冲后回正。 */
export function stampDrop(frame: number, start: number, from = -260) {
  const p = spring({ frame: Math.max(0, frame - start), fps: FPS, config: STAMP_SPRING });
  return {
    opacity: Math.min(1, p * 2.4),
    translateY: (1 - p) * from,
    rotate: (1 - p) * 2,
    scale: 1.28 - 0.28 * p,
  };
}

/** 滚动：linear，速度 ≤ 60px/s。 */
export function scrollLinear(frame: number, speed = 56, delay = 0) {
  return Math.max(0, frame - delay) * (speed / FPS);
}

/** 0 → 1 的定点缓动，18 帧默认时长（卡片曲线）。 */
export function progressAt(frame: number, delay = 0, duration = 18) {
  return interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_CARD,
  });
}
