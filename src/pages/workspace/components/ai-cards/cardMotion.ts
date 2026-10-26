import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion, type Transition, type Variants } from "motion/react";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export const CARD_SPRING: Transition = { type: "tween", duration: 0.18, ease: EASE_OUT_EXPO };
export const ROW_SPRING: Transition = { type: "tween", duration: 0.15, ease: EASE_OUT_EXPO };

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  shown: { opacity: 1, y: 0, transition: CARD_SPRING },
};

export const rowVariants: Variants = {
  hidden: { opacity: 1 },
  shown: { opacity: 1 },
};

export function useCountUp(target: number, _options?: { from?: number; duration?: number }) {
  return target;
}

export function useTween(target: number | null) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(target ?? 0);
  const shownRef = useRef(shown);
  useEffect(() => {
    if (target === null) return;
    if (reduce) { shownRef.current = target; setShown(target); return; }
    const controls = animate(shownRef.current, target, {
      duration: 0.15, ease: EASE_OUT_EXPO, onUpdate: v => { shownRef.current = v; setShown(v); },
    });
    return () => controls.stop();
  }, [target, reduce]);
  return target === null ? null : shown;
}
