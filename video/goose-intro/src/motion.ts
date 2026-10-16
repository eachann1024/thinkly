import { Easing, interpolate, spring } from 'remotion';
import { FPS } from './timeline';

export const EASE_GLIDE = Easing.bezier(0.45, 0, 0.2, 1);
export const EASE_SOFT = Easing.bezier(0.33, 0, 0.15, 1);
export const EASE_TEXT_IN = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_EXIT = Easing.bezier(0.5, 0, 0.75, 0);
export const EASE_BREEZE = Easing.bezier(0.37, 0, 0.63, 1);

type SpringInput = { zeta: number; stiffness: number; mass: number };

/** 以阻尼比 ζ 描述弹簧：damping = 2ζ√(k·m)。 */
export const springByRatio = ({ zeta, stiffness, mass }: SpringInput) => ({
  damping: 2 * zeta * Math.sqrt(stiffness * mass),
  stiffness,
  mass,
  overshootClamping: false,
});

export const SPRING_TEXT = springByRatio({ zeta: 0.9, stiffness: 120, mass: 1 });
export const SPRING_KEY = springByRatio({ zeta: 0.6, stiffness: 180, mass: 1 });
export const SPRING_LOGO = springByRatio({ zeta: 0.85, stiffness: 100, mass: 1 });

export const springAt = (
  frame: number,
  start: number,
  config: ReturnType<typeof springByRatio>,
) => spring({ frame: frame - start, fps: FPS, config });

/** 带缓动与双端钳制的区间映射，全片唯一的 interpolate 入口。 */
export const tween = (
  frame: number,
  [f0, f1]: [number, number],
  [v0, v1]: [number, number],
  easing: (t: number) => number,
) =>
  interpolate(frame, [f0, f1], [v0, v1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
