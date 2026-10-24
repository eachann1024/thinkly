import { getToolProgressStepText } from "./toolProgressText";
import { readObject } from "./toolProgressValues";
export { getToolProgressStepText } from "./toolProgressText";
import { isDefaultChatSkillPart } from "./toolProgressVisibility";
import { toInfoCard, type WebResultsCardData } from "@/lib/notebook-ai/cards/types";

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
): ProgressStep[] {
  return parts
    .filter((part) => !isDefaultChatSkillPart(part))
    .map((part) => {
      const step: ProgressStep = {
        ...getToolProgressStepText(part),
        status: getToolProgressStepStatus(part, isMessageStreaming),
      };
      if (part.type !== "tool-searchWeb" || part.state !== "output-available") return step;
      const card = toInfoCard("searchWeb", part.output);
      return card?.kind === "webResults" ? { ...step, webResults: card } : step;
    });
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
