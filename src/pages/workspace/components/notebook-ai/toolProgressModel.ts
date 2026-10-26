import { ToolProgressStep } from "./ToolProgressStep";
import type { NotebookAiCompletion } from "@/lib/notebook-ai/types";
import { readObject } from "./toolProgressValues";
import { finalizeToolProgressSteps, type ToolProgressFacts } from "./toolProgressFacts";
export { getToolProgressStepText } from "./toolProgressText";
import { isHiddenSkillPart } from "./toolProgressVisibility";
import { type WebResultsCardData } from "@/lib/notebook-ai/cards/types";

export interface ToolProgressPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { approved?: boolean };
  toolCallId?: string;
}

export interface ProgressStep {
  id?: string;
  label: string;
  detail: string;
  webResults?: WebResultsCardData;
  status:
    | "running"
    | "done"
    | "error"
    | "waiting"
    | "approval"
    | "cancelled"
    | "undone";
}

const INPUT_ONLY_STATES = new Set([
  "call",
  "partial-call",
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

function isInputOnly(part: ToolProgressPart) {
  return INPUT_ONLY_STATES.has(part.state ?? "");
}

export function getToolProgressStepStatus(
  part: ToolProgressPart,
  isMessageStreaming?: boolean,
): ProgressStep["status"] {
  if (part.state === "output-error" || part.errorText) return "error";
  if (
    part.type === "tool-executeBatchPlan" &&
    part.state === "output-available" &&
    readObject(part.output)?.ok === false
  ) {
    return "error";
  }
  if (
    part.state === "output-denied" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  )
    return "cancelled";
  const output = readObject(part.output);
  if (part.type === "tool-executeBatchPlan" && output?.status === "undone")
    return "undone";
  if (
    part.state === "approval-requested" ||
    (part.type === "tool-executeBatchPlan" &&
      output?.status === "prepared" &&
      output?.needsApproval === true)
  )
    return "approval";
  if (part.state === "approval-responded" && part.approval?.approved === true)
    return "running";
  if (isInputOnly(part)) return isMessageStreaming ? "running" : "waiting";
  return "done";
}

export function buildToolProgressSteps(
  parts: ToolProgressPart[],
  isMessageStreaming?: boolean,
  completion?: NotebookAiCompletion,
): ProgressStep[] {
  const steps: ProgressStep[] = new Array(parts.length);
  const facts: ToolProgressFacts = { total: 0, hasWaiting: false, hasRunning: false };
  const interrupted = Boolean(completion && completion !== "complete");
  for (const part of parts) {
    if (isHiddenSkillPart(part)) continue;
    const rawStatus = getToolProgressStepStatus(part, isMessageStreaming);
    const status = interrupted && (rawStatus === "running" || rawStatus === "waiting") ? "cancelled" : rawStatus;
    const step = new ToolProgressStep(part, status);
    steps[facts.total++] = step;
    if (status === "done") facts.lastDone = step;
    else if (status === "running") { facts.lastRunning = step; facts.hasRunning = true; }
    else if (status === "waiting") facts.hasWaiting = true;
    else if (status === "error" && !facts.firstError) facts.firstError = step;
  }
  steps.length = facts.total;
  facts.lastStep = steps.at(-1);
  return finalizeToolProgressSteps(steps, facts);
}

function buildSummary(steps: ProgressStep[]) {
  const errorStep = steps.find((step) => step.status === "error");
  if (errorStep) return errorStep.detail;

  return steps
    .filter((step) => step.status === "done" || step.status === "running")
    .slice(-3)
    .map((step) => step.detail)
    .join("、");
}

export function getToolProgressSummary(
  parts: ToolProgressPart[],
  isMessageStreaming?: boolean,
) {
  return buildSummary(buildToolProgressSteps(parts, isMessageStreaming));
}
