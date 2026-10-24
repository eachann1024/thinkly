import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion, type Transition, type Variants } from "motion/react";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const CARD_SPRING: Transition = { type: "spring", stiffness: 420, damping: 38, mass: 1 };
export const ROW_SPRING: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 };

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { ...CARD_SPRING, staggerChildren: 0.035, delayChildren: 0.06 } },
};

export const rowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  shown: { opacity: 1, y: 0, transition: ROW_SPRING },
};

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
