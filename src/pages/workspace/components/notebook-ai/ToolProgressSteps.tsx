import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { WebResultLink } from "../ai-cards/WebResultsCard";
import { EASE_OUT_EXPO, ROW_SPRING } from "../ai-cards/cardMotion";
import { StepCheck, StepSpinner } from "../ai-cards/StepMarks";
import type { ProgressStep } from "./toolProgressModel";

const listVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  shown: { opacity: 1, height: "auto", transition: { height: { duration: 0.32, ease: EASE_OUT_EXPO }, opacity: { duration: 0.18 }, staggerChildren: 0.03 } },
  exit: { opacity: 0, height: 0, transition: { height: { duration: 0.22, ease: [0.4, 0, 1, 1] }, opacity: { duration: 0.12 } } },
};
const stepVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  shown: { opacity: 1, y: 0, transition: ROW_SPRING },
};

export function ToolProgressSteps({ steps, statusLabel }: {
  steps: ProgressStep[];
  statusLabel: (status: ProgressStep["status"]) => string;
}) {
  const reduce = useReducedMotion();
  return <motion.ul className="notebook-ai-work-steps" variants={listVariants} initial={reduce ? false : "hidden"} animate="shown" exit={reduce ? undefined : "exit"}
    style={{ overflow: "hidden" }}>
    {steps.map((step, index) => <motion.li key={index} className="notebook-ai-work-step" data-status={step.status} variants={stepVariants}>
      <span className="notebook-ai-work-step-mark">
        {step.status === "running" ? <StepSpinner/> : step.status === "done" ? <StepCheck/> : null}
      </span>
      <div className="notebook-ai-work-step-body">
        <div className="notebook-ai-work-step-row">
          <span className={cn("notebook-ai-work-step-label", step.status === "running" && "ai-shimmer-text")}>{step.label}</span>
          <span className={cn("notebook-ai-work-step-st", step.status === "error" && "text-[var(--goose-color-danger-focus)]")}>
            {statusLabel(step.status)}
          </span>
        </div>
        {step.status === "error" && step.detail ? <p className="notebook-ai-work-step-detail">{step.detail}</p> : null}
        {step.webResults ? <ul className="ai-card-web notebook-ai-work-step-links">
          {step.webResults.results.slice(0, 4).map(result => <WebResultLink key={result.url} result={result}/>)}
        </ul> : null}
      </div>
    </motion.li>)}
  </motion.ul>;
}
