import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "./cardMotion";
import "./ai-cards.css";

export function StepCheck({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return <svg className={cn("ai-step-check", className)} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <motion.path d="M2.5 6.4 5 8.8 9.6 3.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}/>
  </svg>;
}

export function StepSpinner() {
  return <svg className="ai-step-spinner" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="1.5"/>
    <path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}

export function StepCross() {
  const reduce = useReducedMotion();
  return <svg className="ai-step-cross" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <motion.path d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}/>
  </svg>;
}
