import { useLocale } from "@/i18n";
import { useContext } from "react";
import type {
  TextMessagePartProps,
  ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { ApprovalPlanCard } from "../ApprovalPlanCard";
import type { ToolDisplayPart } from "../toolProgressVisibility";
import { AssistantToolRenderContext } from "./toolRenderContext";
import { AssistantStreamdownText } from "./AssistantStreamdownText";
import { shouldShowToolPart } from "./messagePresentation";
import { renderToolVisual } from "./toolVisual";
function AssistantTextPart({ text, status }: TextMessagePartProps) {
  useLocale();
  const ctx = useContext(AssistantToolRenderContext);
  const isPartStreaming =
    Boolean(ctx?.isStreaming) && status.type === "running";
  return (
    <AssistantStreamdownText
      text={text}
      isStreaming={isPartStreaming}
      editorRef={ctx?.editorRef}
    />
  );
}

function AssistantApprovalPart({ artifact }: ToolCallMessagePartProps) {
  useLocale();
  const ctx = useContext(AssistantToolRenderContext);
  if (!ctx) return null;
  const { isStreaming, onBatchApproval, onBatchUndo } = ctx;
  const part = artifact as ToolDisplayPart | undefined;
  if (!part || part.type !== "tool-executeBatchPlan") return null;
  if (!shouldShowToolPart(part, isStreaming)) return null;
  if (
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    part.state === "call" ||
    part.state === "partial-call"
  ) {
    return null;
  }
  return (
    <ApprovalPlanCard
      part={part}
      onApprovalResponse={onBatchApproval}
      onUndo={onBatchUndo}
      embedded
    />
  );
}

function AssistantArtifactPart({ artifact }: ToolCallMessagePartProps) {
  useLocale();
  const ctx = useContext(AssistantToolRenderContext);
  if (!ctx) return null;
  const { isStreaming, editorRef } = ctx;
  const part = artifact as ToolDisplayPart | undefined;
  if (!part || part.type === "tool-executeBatchPlan") return null;
  if (!shouldShowToolPart(part, isStreaming)) return null;
  return renderToolVisual(
    part,
    part.toolCallId ?? part.type,
    editorRef,
    isStreaming,
  );
}

function NullMessagePart() {
  return null;
}

export const ASSISTANT_TEXT_PARTS = {
  Text: AssistantTextPart,
  Reasoning: NullMessagePart,
  tools: { Override: NullMessagePart },
};

export const ASSISTANT_APPROVAL_PARTS = {
  Text: NullMessagePart,
  Reasoning: NullMessagePart,
  tools: { Override: AssistantApprovalPart },
};

export const ASSISTANT_ARTIFACT_PARTS = {
  Text: NullMessagePart,
  Reasoning: NullMessagePart,
  tools: { Override: AssistantArtifactPart },
};
