import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";
import { useRef, useReducer } from "react";
import { Loader2, RotateCcw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useNotebooks } from "@/stores/useNotebooks";
import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import { ApprovalCard } from "../beautiful-ui/ApprovalCard";
import {
  useEmbeddedWorkCardStatus,
  type WorkCardStatusData,
} from "../workCardStatusContext";
import type { ApprovalPlanCardProps } from "./types";
import { readReviewPlan } from "./planReviewData";
import { usePlanReviewSelection } from "./PlanReviewContext";
import { planReviewState, reviewOutput } from "./reviewState";
import { requestPlanRefinement } from "./refinePlan";
import "./plan-review.css";
import { reviewActionReducer } from "./reviewActionState";
import messages from "./ReviewActions.messages.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);


export function ReviewActions({
  part,
  onApprovalResponse,
  onUndo,
  embedded = false,
}: ApprovalPlanCardProps) {
  const { input, journal } = readReviewPlan(part);
  const output = reviewOutput(part.output);
  const operationIds =
    input?.operations.map((operation) => operation.operationId) ?? [];
  const { selectedIds, setLocked } = usePlanReviewSelection(
    `${part.toolCallId ?? ""}:${input?.runId ?? ""}`,
    operationIds,
    journal?.selectedOperationIds,
  );
  const [action, dispatch] = useReducer(reviewActionReducer, { status: "idle" });
  const submitting = action.status === "responding";
  const approving = action.status === "responding" && action.approved;
  const undoing = action.status === "undoing";
  const undoResult = action.status === "undo-finished" ? action.result : action.status === "undoing" ? action.previousResult : null;
  const actionError = action.status === "response-failed" ? action.error :
    action.status === "undoing" || action.status === "undo-finished" ? action.responseError ?? "" : "";
  const busyRef = useRef(false);
  const review = planReviewState(part, journal);
  const canApprove =
    review.phase === "approval" &&
    Boolean(journal && input && part.toolCallId && selectedIds.length) &&
    !submitting;
  const hasError =
    ["failed", "invalid", "conflict"].includes(review.phase) ||
    Boolean(actionError);
  const undone = review.phase === "undone" || undoResult?.ok === true;
  const undoConflict =
    undoResult?.status === "undo-conflicted" ||
    journal?.status === "undo-conflicted";
  const undoFailed = undoResult?.ok === false;
  const status: WorkCardStatusData =
    submitting || review.phase === "executing"
      ? {
          label: submitting && !approving ? t("canceling") : t("applying"),
          icon: "running",
          tone: "accent",
        }
      : undoing
        ? { get label() { return t("undoing"); }, icon: "running", tone: "accent" }
        : undone
          ? { get label() { return t("undone"); }, icon: "undone", tone: "neutral" }
          : undoFailed || undoConflict
            ? {
                label: undoConflict ? t("undoConflict") : t("undoFailed"),
                icon: "error",
                tone: "danger",
              }
            : hasError
              ? {
                  label: actionError ? t("incomplete") : review.label,
                  icon: "error",
                  tone: "danger",
                }
              : review.phase === "approval"
                ? { label: review.label, icon: "waiting", tone: "warning" }
                : review.phase === "cancelled"
                  ? { label: review.label, icon: "cancelled", tone: "neutral" }
                  : review.phase === "applied"
                    ? { label: review.label, icon: "done", tone: "success" }
                    : { label: review.label, icon: "running", tone: "accent" };
  useEmbeddedWorkCardStatus(status, embedded);
  const respond = async (approved: boolean) => {
    if (
      !part.toolCallId ||
      !input?.runId ||
      busyRef.current ||
      (approved && !canApprove)
    )
      return;
    busyRef.current = true;
    dispatch({ type: "respond", approved });
    setLocked(true);
    try {
      await onApprovalResponse({
        approvalId: part.approval?.id ?? `batch-approval-${part.toolCallId}`,
        toolCallId: part.toolCallId,
        runId: input.runId,
        approved,
        selectedOperationIds: approved ? selectedIds : [],
      });
      dispatch({ type: "responded" });
    } catch (error) {
      dispatch({ type: "response-failed", error: formatNotebookAiError(error, { phase: "execute" }) });
    } finally {
      busyRef.current = false;
      setLocked(false);
    }
  };
  const undo = async () => {
    const toolCallId =
      typeof output.toolCallId === "string"
        ? output.toolCallId
        : part.toolCallId;
    const runId =
      typeof output.runId === "string" ? output.runId : input?.runId;
    if (!toolCallId || !runId || busyRef.current) return;
    busyRef.current = true;
    dispatch({ type: "undo" });
    try {
      dispatch({ type: "undo-finished", result: await onUndo(toolCallId, runId) });
    } catch (error) {
      dispatch({ type: "undo-finished", result: {
        ok: false,
        error: formatNotebookAiError(error, { phase: "undo" }),
      } });
    } finally {
      busyRef.current = false;
    }
  };
  const regenerate = () => {
    const notebookId =
      journal?.notebookId ?? useNotebooks.getState().activeNotebookId;
    if (!notebookId) return;
    requestPlanRefinement({
      notebookId,
      text: `方案「${input?.title ?? "笔记变更计划"}」${review.phase === "conflict" ? "遇到原文或位置冲突" : "未能完成"}。请重新读取目标笔记，检查当前内容和先前操作的结果，基于现状重新生成待确认方案，避免重复执行已完成的变更。\n${review.error ? `原因：${review.error}\n` : ""}\n我的补充要求：`,
    });
  };
  const secondaryClass =
    "h-[40px] text-[14px] text-foreground shadow-none";
  const detail = submitting
    ? approving
      ? t("applyingSelectedChangesPleaseWait")
      : t("cancelingThisPlanPleaseWait")
    : undoing
      ? t("undoingTheseChangesPleaseWait")
      : undone
        ? t("theseChangesHaveBeenUndone")
        : undoConflict
          ? t("theNotesChangedAfterThePlanWasApplied")
          : undoFailed
            ? t("couldNotUndoTheChangesCheckTheTarget")
            : review.detail;
  const reason = localizeNotebookAiDiagnostic(actionError || undoResult?.error || review.error);
  const canUndo =
    (review.phase === "applied" || undoConflict) &&
    output.canUndo !== false &&
    !undone;
  const footer = (
    <div className="notebook-ai-review-footer">
      <p aria-live="polite">{detail}</p>
      {review.phase === "applied" &&
      review.selectedCount !== undefined &&
      operationIds.length > review.selectedCount ? (
        <p className="text-muted-foreground">
          {t("skippedCount", { count: operationIds.length - review.selectedCount })}
        </p>
      ) : null}
      {reason ? (
        <p className="text-[var(--goose-color-danger-focus)]" role="alert">
          {reason}
        </p>
      ) : null}
      {review.phase === "approval" ? (
        <>
          {!journal ? (
            <p className="text-[var(--goose-color-danger-focus)]" role="alert">
              {t("theOriginalPlanIsNoLongerAvailableGenerate")}
            </p>
          ) : null}
          <div className="grid grid-cols-[1fr_1.2fr] gap-2.5">
            <Button
              type="button"
              variant="secondary"
              className={secondaryClass}
              disabled={submitting}
              onClick={() => void respond(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="goose-interactive-primary h-[40px] text-[14px] font-semibold shadow-none"
              disabled={!canApprove}
              onClick={() => void respond(true)}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("applyCount", { count: selectedIds.length })}
            </Button>
          </div>
          {!journal ? (
            <Button
              type="button"
              variant="secondary"
              className={secondaryClass}
              onClick={regenerate}
            >
              {t("regeneratePlan")}
            </Button>
          ) : null}
        </>
      ) : null}
      {canUndo ? (
        <Button
          type="button"
          variant="secondary"
          className={`${secondaryClass} w-full`}
          disabled={undoing}
          onClick={() => void undo()}
        >
          {undoing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {undoFailed || undoConflict ? t("retryUndo") : t("undoTheseChanges")}
        </Button>
      ) : null}
      {hasError && !undoConflict ? (
        <Button
          type="button"
          variant="secondary"
          className={secondaryClass}
          onClick={regenerate}
        >
          {t("reviseAndRegeneratePlan")}
        </Button>
      ) : null}
    </div>
  );
  return embedded ? (
    footer
  ) : (
    <ApprovalCard
      title={input?.title ?? t("noteChangePlan")}
      status={status}
      footer={footer}
    />
  );
}
