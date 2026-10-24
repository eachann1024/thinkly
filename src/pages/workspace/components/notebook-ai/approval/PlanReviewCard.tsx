import { useLocale } from "@/i18n";
import { ToolProgressCard } from "../ToolProgressCard";
import { ReviewActions } from "./ReviewActions";
import { ReviewProposal } from "./ReviewProposal";
import type { ApprovalPlanCardProps } from "./types";

export function PlanReviewCard({
  part,
  onApprovalResponse,
  onUndo,
}: ApprovalPlanCardProps) {
  useLocale();
  return (
    <ToolProgressCard
      parts={[{ ...part, type: "tool-executeBatchPlan" }]}
      footer={
        <ReviewActions
          part={part}
          onApprovalResponse={onApprovalResponse}
          onUndo={onUndo}
          embedded
        />
      }
    >
      <ReviewProposal part={part} />
    </ToolProgressCard>
  );
}
