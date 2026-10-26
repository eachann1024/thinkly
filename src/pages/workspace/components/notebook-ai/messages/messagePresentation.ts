import { createTranslator, i18nYaml } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/messages/messagePresentation.ts#messages:1">`
zh-Hans:
  compactCommand: "/压缩"
en:
  compactCommand: "/compact"
ja:
  compactCommand: "/圧縮"
`;
const t = createTranslator(messages);
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { ApprovalPlanPart } from "../ApprovalPlanCard";
import { isNotebookAiToolPart } from "@/lib/notebook-ai/messageUtils";
import {
  isHiddenSkillPart,
  type ToolDisplayPart,
} from "../toolProgressVisibility";
const INPUT_ONLY_STATES = new Set([
  "call",
  "partial-call",
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

export function getTextPartText(message: NotebookAiMessage) {
  const textPart = message.parts?.find((p) => p.type === "text");
  return textPart && "text" in textPart
    ? (textPart as { text: string }).text
    : "";
}

export function collectReasoningText(message: NotebookAiMessage): string {
  const chunks: string[] = [];
  for (const part of message.parts ?? []) {
    if (part.type !== "reasoning" || !("text" in part)) continue;
    const text = String(part.text ?? "").trim();
    if (text) chunks.push(text);
  }
  return chunks.join("\n");
}

export interface AssistantMessagePresentation {
  hasText: boolean;
  reasoningText: string;
  progressToolParts: ToolDisplayPart[];
  visibleApprovalPart?: ApprovalPlanPart;
  otherApprovalParts: ApprovalPlanPart[];
}

function isVisibleApprovalCandidate(part: ToolDisplayPart) {
  return (
    part.type === "tool-executeBatchPlan" &&
    part.state !== "input-streaming" &&
    part.state !== "input-available" &&
    part.state !== "call" &&
    part.state !== "partial-call"
  );
}

export function deriveAssistantMessagePresentation(
  message: NotebookAiMessage,
  isMessageStreaming: boolean,
): AssistantMessagePresentation {
  let hasTextPart = false;
  let hasText = false;
  let reasoningText = "";
  const progressToolParts: ToolDisplayPart[] = [];
  let visibleApprovalPart: ApprovalPlanPart | undefined;
  const otherApprovalParts: ApprovalPlanPart[] = [];

  for (const part of message.parts ?? []) {
    if (part.type === "text" && !hasTextPart) {
      hasTextPart = true;
      hasText = "text" in part && String(part.text ?? "").trim().length > 0;
    }
    if (part.type === "reasoning" && "text" in part) {
      const chunk = String(part.text ?? "").trim();
      if (chunk) reasoningText = chunk;
    }
    if (!isNotebookAiToolPart(part)) continue;
    if (!shouldShowToolPart(part, isMessageStreaming)) continue;

    const toolPart = part as ToolDisplayPart;
    progressToolParts.push(toolPart);
    if (!isVisibleApprovalCandidate(toolPart)) continue;
    if (visibleApprovalPart) otherApprovalParts.push(toolPart);
    else visibleApprovalPart = toolPart;
  }

  return {
    hasText,
    reasoningText,
    progressToolParts,
    visibleApprovalPart,
    otherApprovalParts,
  };
}

export function getUserDisplayText(message: NotebookAiMessage) {
  const metadataText = message.metadata?.displayText?.trim();
  if (message.metadata?.compacted && metadataText === "/压缩") return t("compactCommand");
  if (metadataText) return metadataText;

  const rawText = getTextPartText(message).trim();
  const hiddenContextStart = rawText.indexOf("\n\n本轮笔记上下文：");
  if (rawText.startsWith("用户输入：") && hiddenContextStart > -1) {
    return rawText.slice("用户输入：".length, hiddenContextStart).trim();
  }
  if (rawText.startsWith("用户输入：")) {
    return rawText.slice("用户输入：".length).trim();
  }
  return rawText;
}

export function getUserImageParts(message: NotebookAiMessage) {
  return (message.parts ?? []).filter(
    (
      part,
    ): part is {
      type: "file";
      url: string;
      filename?: string;
      mediaType: string;
    } =>
      part.type === "file" &&
      "url" in part &&
      typeof part.url === "string" &&
      "mediaType" in part &&
      typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/"),
  );
}

export function shouldShowToolPart(
  part: ToolDisplayPart,
  isMessageStreaming: boolean,
) {
  if (isHiddenSkillPart(part)) return false;
  const state = part.state ?? "";
  if (
    part.type === "tool-executeBatchPlan" &&
    (state === "approval-requested" || state === "approval-responded")
  ) {
    return true;
  }
  const hasTerminalPayload =
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied" ||
    part.output !== undefined ||
    Boolean(part.errorText);

  return (
    isMessageStreaming || !INPUT_ONLY_STATES.has(state) || hasTerminalPayload
  );
}

export function hasVisibleApprovalPart(
  parts: ToolDisplayPart[],
  isMessageStreaming: boolean,
) {
  return parts.some(
    (part) =>
      part.type === "tool-executeBatchPlan" &&
      shouldShowToolPart(part, isMessageStreaming) &&
      part.state !== "input-streaming" &&
      part.state !== "input-available" &&
      part.state !== "call" &&
      part.state !== "partial-call",
  );
}

export function findVisibleApprovalPart(
  parts: ToolDisplayPart[],
  isMessageStreaming: boolean,
): ApprovalPlanPart | undefined {
  return parts.find(
    (part) =>
      part.type === "tool-executeBatchPlan" &&
      shouldShowToolPart(part, isMessageStreaming) &&
      part.state !== "input-streaming" &&
      part.state !== "input-available" &&
      part.state !== "call" &&
      part.state !== "partial-call",
  );
}
