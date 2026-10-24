import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_EXPO } from "./cardMotion";

export function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    setHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, []);
  return <motion.div className={className} style={{ overflow: "hidden" }} initial={false} animate={{ height }}
    transition={reduce ? { duration: 0 } : { duration: 0.42, ease: EASE_OUT_EXPO }}>
    <div ref={innerRef}>{children}</div>
  </motion.div>;
}
