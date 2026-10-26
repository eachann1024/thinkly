import { useLocale } from "@/i18n";
import { MessagePrimitive } from "@assistant-ui/react";
import { useMemo, useRef } from "react";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { ToolProgressCard } from "../ToolProgressCard";
import { ApprovalPlanCard, BatchPlanProposal } from "../ApprovalPlanCard";
import { PlanReviewCard } from "../approval/PlanReviewCard";
import { shouldShowToolProgress } from "../toolProgressVisibility";
import {
  AssistantToolRenderContext,
  type AssistantToolRenderContextValue,
} from "./toolRenderContext";
import {
  deriveAssistantMessagePresentation,
} from "./messagePresentation";
import { AssistantLetterFold } from "./AssistantLetterFold";
import {
  ASSISTANT_TEXT_PARTS,
  ASSISTANT_ARTIFACT_PARTS,
  ASSISTANT_CHOICE_PARTS,
} from "./assistantParts";
import { MessageActionBar } from "./MessageActionBar";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/messages/AssistantMessage.tsx#messages:1">`
zh-Hans:
  thisResponseCouldNotBeGenerated: "这条回复生成失败。"
en:
  thisResponseCouldNotBeGenerated: "This response could not be generated."
ja:
  thisResponseCouldNotBeGenerated: "この回答を生成できませんでした。"
`;
const t = createTranslator(messages);

export function AssistantMessage({
  msg,
  isStreaming,
  toolRenderBase,
}: {
  msg: NotebookAiMessage;
  isStreaming: boolean;
  toolRenderBase: Omit<AssistantToolRenderContextValue, "isStreaming">;
}) {
  useLocale();
  const completion = isStreaming ? undefined : msg.metadata?.completion;
  const presentationCache = useRef<{
    isStreaming: boolean;
    presentation: ReturnType<typeof deriveAssistantMessagePresentation>;
  } | null>(null);
  const presentation = useMemo(() => {
    const next = deriveAssistantMessagePresentation(msg, isStreaming);
    const previous = presentationCache.current;
    if (
      previous &&
      previous.isStreaming === isStreaming &&
      previous.presentation.progressToolParts.length === next.progressToolParts.length
    ) {
      let sameToolParts = true;
      for (let index = 0; index < next.progressToolParts.length; index += 1) {
        if (
          previous.presentation.progressToolParts[index] !==
          next.progressToolParts[index]
        ) {
          sameToolParts = false;
          break;
        }
      }
      if (sameToolParts) {
        next.progressToolParts = previous.presentation.progressToolParts;
      }
    }
    presentationCache.current = { isStreaming, presentation: next };
    return next;
  }, [msg.parts, isStreaming]);
  const { progressToolParts, hasText, reasoningText, visibleApprovalPart, otherApprovalParts } = presentation;
  const showToolProgress =
    progressToolParts.length > 0 &&
    shouldShowToolProgress(progressToolParts, isStreaming);
  const showWorkCard =
    Boolean(completion && completion !== "complete") ||
    showToolProgress ||
    progressToolParts.some(part => part.type === "tool-showChoices") ||
    hasText ||
    (isStreaming && (!hasText || reasoningText.length > 0));

  const toolRenderValue: AssistantToolRenderContextValue = {
    ...toolRenderBase,
    isStreaming,
  };

  return (
    <AssistantToolRenderContext.Provider value={toolRenderValue}>
      <MessagePrimitive.Root className="notebook-ai-message notebook-ai-message-assistant min-w-0 max-w-full overflow-x-hidden space-y-4">
        {showWorkCard ? (
          <ToolProgressCard
            parts={progressToolParts}
            execution={msg.metadata?.execution}
            isMessageStreaming={isStreaming}
            completion={completion}
            thinkingText={reasoningText}
            footer={
              visibleApprovalPart ? (
                <ApprovalPlanCard
                  part={visibleApprovalPart}
                  onApprovalResponse={toolRenderBase.onBatchApproval}
                  onUndo={toolRenderBase.onBatchUndo}
                  embedded
                />
              ) : undefined
            }
          >
            {visibleApprovalPart && hasText ? (
              <AssistantLetterFold>
                <MessagePrimitive.Parts components={ASSISTANT_TEXT_PARTS} />
              </AssistantLetterFold>
            ) : (
              <MessagePrimitive.Parts components={ASSISTANT_TEXT_PARTS} />
            )}
            {visibleApprovalPart ? (
              <BatchPlanProposal part={visibleApprovalPart} />
            ) : null}
            <MessagePrimitive.Parts components={ASSISTANT_CHOICE_PARTS} />
          </ToolProgressCard>
        ) : null}
        {otherApprovalParts.map((part) => (
          <PlanReviewCard
            key={part.toolCallId}
            part={part}
            onApprovalResponse={toolRenderBase.onBatchApproval}
            onUndo={toolRenderBase.onBatchUndo}
          />
        ))}
        <MessagePrimitive.Parts components={ASSISTANT_ARTIFACT_PARTS} />
        <MessagePrimitive.Error>
          <p className="text-xs text-danger">{t("thisResponseCouldNotBeGenerated")}</p>
        </MessagePrimitive.Error>
        { }
        {!isStreaming ? <MessageActionBar /> : null}
      </MessagePrimitive.Root>
    </AssistantToolRenderContext.Provider>
  );
}
