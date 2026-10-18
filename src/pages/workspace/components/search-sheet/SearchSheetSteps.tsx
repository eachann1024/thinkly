import { useLocale } from "@/i18n";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "@/components/ui/icons";
import { EASE_OUT_EXPO, ROW_SPRING } from "../ai-cards/cardMotion";
import { StepCheck, StepCross, StepSpinner } from "../ai-cards/StepMarks";
import type { SheetAnswer, SheetStep } from "./sheetAnswerState";
import { stepLabel, stepResult, stepsSummary } from "./sheetStepText";

/** 高度展开：ease-out-expo；收起更快，用 ease-in 曲线让内容先离开。 */
const OPEN: Transition = { height: { duration: 0.36, ease: EASE_OUT_EXPO }, opacity: { duration: 0.2, ease: "easeOut" } };
const CLOSE: Transition = { height: { duration: 0.24, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.14, ease: "easeIn" } };
const collapse: Variants = {
  closed: { height: 0, opacity: 0, transition: CLOSE },
  open: { height: "auto", opacity: 1, transition: OPEN },
};
const row: Variants = {
  hidden: { opacity: 0, y: 6, filter: "blur(2px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: ROW_SPRING },
  gone: { opacity: 0, transition: { duration: 0.12, ease: "easeIn" } },
};
const list: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.04 } } };

/** Agent 刚接手、还没有任何事件时，用一条进行中的「思考」占位，避免时间线停顿。 */
const PENDING_STEP: SheetStep = { id: -1, name: "thinking", subject: "", status: "running" };

function StepMark({ status }: { status: SheetStep["status"] }) {
  return <span className="search-sheet-step-mark" data-status={status}>
    {status === "running" ? <StepSpinner/> : status === "done" ? <StepCheck/> : <StepCross/>}
  </span>;
}

/** 思考原文：默认在回答开始后收起；展开时贴底跟随新内容。 */
function ThinkingText({ text, open }: { text: string; open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && open) el.scrollTop = el.scrollHeight;
  }, [text, open]);
  return <AnimatePresence initial={false}>
    {open && <motion.div key="thinking" className="search-sheet-thinking-wrap" variants={collapse} initial="closed" animate="open" exit="closed">
      <div ref={ref} className="search-sheet-thinking">{text}</div>
    </motion.div>}
  </AnimatePresence>;
}

function StepRow({ step, thinking, thinkingOpen, onToggleThinking }: {
  step: SheetStep; thinking?: string; thinkingOpen: boolean; onToggleThinking: () => void;
}) {
  const label = stepLabel(step);
  const result = stepResult(step);
  const body = <>
    <StepMark status={step.status}/>
    <span className="search-sheet-step-label" data-running={step.status === "running" || undefined}>
      <span className={step.status === "running" ? "ai-shimmer-text" : undefined}>{label}</span>
    </span>
    {result && <motion.span className="search-sheet-step-result goose-tabular" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={ROW_SPRING}>{result}</motion.span>}
    {thinking && <ChevronRight className="search-sheet-step-chev" data-open={thinkingOpen || undefined} size={12} aria-hidden="true"/>}
  </>;
  return <motion.li className="search-sheet-step" data-status={step.status} variants={row} exit="gone" layout="position">
    {thinking
      ? <Button contentStyle="preserve" variant="ghost" size={null} className="search-sheet-step-row" aria-expanded={thinkingOpen} onClick={onToggleThinking}>{body}</Button>
      : <div className="search-sheet-step-row">{body}</div>}
    {thinking && <ThinkingText text={thinking} open={thinkingOpen}/>}
  </motion.li>;
}

/** 回答上方的步骤时间线：进行中逐步展开，完成后收成一行摘要，可点开回看。 */
export const SearchSheetSteps = memo(function SearchSheetSteps({ answer }: { answer: SheetAnswer }) {
  useLocale();
  const reduce = useReducedMotion();
  const finished = answer.status === "done";
  const active = answer.status === "loading" || answer.status === "streaming";
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [thinkingToggle, setThinkingToggle] = useState<boolean | null>(null);

  const steps = active && !answer.steps.some(step => step.status === "running") ? [...answer.steps, PENDING_STEP] : answer.steps;
  if (steps.length === 0) return null;
  const open = expanded ?? !finished;
  const thinkingId = [...steps].reverse().find(step => step.name === "thinking" && step.id !== -1)?.id;
  const thinkingOpen = thinkingToggle ?? !answer.text;

  return <div className="search-sheet-steps" data-finished={finished || undefined}>
    <AnimatePresence initial={false}>
      {finished && <motion.div key="summary" initial={reduce ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={ROW_SPRING}>
        <Button contentStyle="preserve" variant="ghost" size={null} className="search-sheet-steps-summary" aria-expanded={open} onClick={() => setExpanded(!open)}>
          <StepCheck className="search-sheet-steps-summary-check"/>
          <span className="goose-tabular">{stepsSummary(answer.steps)}</span>
          <ChevronRight className="search-sheet-step-chev" data-open={open || undefined} size={12} aria-hidden="true"/>
        </Button>
      </motion.div>}
    </AnimatePresence>
    <AnimatePresence initial={false}>
      {open && <motion.div key="list" className="search-sheet-steps-collapse" variants={collapse} initial="closed" animate="open" exit="closed">
        <motion.ol className="search-sheet-step-list" variants={list} initial={reduce ? false : "hidden"} animate="shown">
          <AnimatePresence initial={false}>
            {steps.map(step => <StepRow key={step.id} step={step}
              thinking={step.id === thinkingId && answer.thinking ? answer.thinking : undefined}
              thinkingOpen={thinkingOpen} onToggleThinking={() => setThinkingToggle(!thinkingOpen)}/>)}
          </AnimatePresence>
        </motion.ol>
      </motion.div>}
    </AnimatePresence>
  </div>;
});
