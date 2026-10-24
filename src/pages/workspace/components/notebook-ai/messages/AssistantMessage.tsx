import { useLocale } from "@/i18n";
import { MessagePrimitive } from "@assistant-ui/react";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { isNotebookAiToolPart } from "@/lib/notebook-ai/messageUtils";
import { ToolProgressCard } from "../ToolProgressCard";
import { ApprovalPlanCard, BatchPlanProposal } from "../ApprovalPlanCard";
import { PlanReviewCard } from "../approval/PlanReviewCard";
import { shouldShowToolProgress } from "../toolProgressVisibility";
import {
  AssistantToolRenderContext,
  type AssistantToolRenderContextValue,
} from "./toolRenderContext";
import {
  collectReasoningText,
  getTextPartText,
  shouldShowToolPart,
  findVisibleApprovalPart,
} from "./messagePresentation";
import { AssistantLetterFold } from "./AssistantLetterFold";
import {
  ASSISTANT_TEXT_PARTS,
  ASSISTANT_ARTIFACT_PARTS,
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
  const progressToolParts = (msg.parts ?? [])
    .filter(isNotebookAiToolPart)
    .filter((part) => shouldShowToolPart(part, isStreaming));
  const showToolProgress =
    progressToolParts.length > 0 &&
    shouldShowToolProgress(progressToolParts, isStreaming);
  const hasText = getTextPartText(msg).trim().length > 0;
  const reasoningText = collectReasoningText(msg);
  const showWorkCard =
    showToolProgress ||
    hasText ||
    (isStreaming && (!hasText || reasoningText.length > 0));

  const toolRenderValue: AssistantToolRenderContextValue = {
    ...toolRenderBase,
    isStreaming,
  };
  const visibleApprovalPart = findVisibleApprovalPart(
    progressToolParts,
    isStreaming,
  );
  const otherApprovalParts = progressToolParts
    .map((part) => findVisibleApprovalPart([part], isStreaming))
    .filter((part): part is NonNullable<typeof part> =>
      Boolean(part && part !== visibleApprovalPart),
    );

  return (
    <AssistantToolRenderContext.Provider value={toolRenderValue}>
      <MessagePrimitive.Root className="notebook-ai-message notebook-ai-message-assistant min-w-0 max-w-full overflow-x-hidden space-y-4">
        {showWorkCard ? (
          <ToolProgressCard
            parts={progressToolParts}
            isMessageStreaming={isStreaming}
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
