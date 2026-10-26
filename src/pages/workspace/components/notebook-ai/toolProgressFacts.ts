import type { ProgressStep } from "./toolProgressModel";

export interface ToolProgressFacts {
  total: number;
  firstError?: ProgressStep;
  lastRunning?: ProgressStep;
  lastDone?: ProgressStep;
  lastStep?: ProgressStep;
  hasWaiting: boolean;
  hasRunning: boolean;
}

const immutableSteps = new WeakSet<ProgressStep[]>();
const factsBySteps = new WeakMap<ProgressStep[], ToolProgressFacts>();

export function finalizeToolProgressSteps(steps: ProgressStep[], facts?: ToolProgressFacts) {
  Object.freeze(steps);
  immutableSteps.add(steps);
  if (facts) factsBySteps.set(steps, facts);
  return steps;
}

export function getToolProgressFacts(steps: readonly ProgressStep[]): ToolProgressFacts {
  const key = steps as ProgressStep[];
  if (immutableSteps.has(key)) {
    const cached = factsBySteps.get(key);
    if (cached) return cached;
  }

  let firstError: ProgressStep | undefined;
  let lastRunning: ProgressStep | undefined;
  let lastDone: ProgressStep | undefined;
  let hasWaiting = false;
  let hasRunning = false;
  for (const step of steps) {
    if (!firstError && step.status === "error") firstError = step;
    if (step.status === "running") {
      lastRunning = step;
      hasRunning = true;
    } else if (step.status === "done") {
      lastDone = step;
    } else if (step.status === "waiting") {
      hasWaiting = true;
    }
  }

  const facts: ToolProgressFacts = {
    total: steps.length,
    firstError,
    lastRunning,
    lastDone,
    lastStep: steps.at(-1),
    hasWaiting,
    hasRunning,
  };
  if (immutableSteps.has(key)) factsBySteps.set(key, facts);
  return facts;
}
