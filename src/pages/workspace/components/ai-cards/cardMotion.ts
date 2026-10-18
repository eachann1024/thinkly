import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion, type Transition, type Variants } from "motion/react";

/** ease-out-expo：快速离开、长尾落定，用于计数与高度展开。 */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** 卡片入场：临界阻尼附近的弹簧（ζ≈0.93），无回弹但落点柔和。 */
export const CARD_SPRING: Transition = { type: "spring", stiffness: 420, damping: 38, mass: 1 };
/** 行内条目：更轻的弹簧，配合 stagger 依次落定。 */
export const ROW_SPRING: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 };

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { ...CARD_SPRING, staggerChildren: 0.035, delayChildren: 0.06 } },
};

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  shown: { opacity: 1, y: 0, transition: ROW_SPRING },
};

/** 数字从 0 附近滚到目标值，时长 0.7s ease-out-expo；减少动态效果时直接显示终值。 */
export function useCountUp(target: number, { from, duration = 0.7 }: { from?: number; duration?: number } = {}) {
  const reduce = useReducedMotion();
  const still = Boolean(reduce) || !Number.isFinite(target);
  const [value, setValue] = useState(from ?? target * 0.6);
  useEffect(() => {
    if (still) return;
    const controls = animate(from ?? target * 0.6, target, { duration, ease: EASE_OUT_EXPO, onUpdate: setValue });
    return () => controls.stop();
  }, [target, from, duration, still]);
  return still ? target : value;
}

/** 结果变化时从当前显示值补间到新值（0.35s ease-out-expo），拖动滑块时数字连续滚动。 */
export function useTween(target: number | null) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(target ?? 0);
  const shownRef = useRef(shown);
  useEffect(() => {
    if (target === null) return;
    if (reduce) { shownRef.current = target; setShown(target); return; }
    const controls = animate(shownRef.current, target, {
      duration: 0.35, ease: EASE_OUT_EXPO, onUpdate: v => { shownRef.current = v; setShown(v); },
    });
    return () => controls.stop();
  }, [target, reduce]);
  return target === null ? null : shown;
}
