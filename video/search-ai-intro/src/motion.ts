import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

/** 卡片/设备入场：18 帧，scale .92 → 1。 */
export const EASE_CARD = Easing.bezier(0.22, 1, 0.36, 1);
/** 底色切换：12 帧交叉淡化。 */
export const EASE_BG = Easing.bezier(0.65, 0, 0.35, 1);
/** 文本 spring：damping 200 / stiffness 120 / mass .6。 */
export const TEXT_SPRING = { damping: 200, stiffness: 120, mass: 0.6 };
/** 强调物件落位：允许 2° 过冲。 */
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
  return {
    opacity: p,
    transform: `scale(${0.92 + 0.08 * p})`,
  };
}

export function fadeColor(frame: number, start: number, duration = 12) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_BG,
  });
}

export function stampDrop(frame: number, start: number) {
  const p = spring({
    frame: Math.max(0, frame - start),
    fps: FPS,
    config: STAMP_SPRING,
  });
  return {
    opacity: Math.min(1, p * 2),
    translateY: (1 - p) * -260,
    rotate: (1 - p) * 16,
    scale: 1.35 - 0.35 * p,
  };
}
