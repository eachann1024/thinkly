import { formatNotebookAiError } from "@/lib/notebook-ai/errors";
import { readObject, truncate } from "./toolProgressValues";
import { batchPlanDestinations } from "./batchPlanDestinations";
import type { ToolProgressPart, ProgressStep } from "./toolProgressModel";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/batchPlanProgressText.ts#messages:1">`
zh-Hans:
  generateBatchPlan: "生成批量计划"
  theseChangesWereCanceled: "已取消本次变更"
  applyBatchPlan: "执行批量计划"
  changesInThisBatchUndone: "已撤回本批变更"
  applyingApprovedChanges: "正在执行已审批的变更"
  thisBatchOfChangesIsComplete: "本批变更已完成"
  planGeneratedAwaitingApproval: "计划已生成，等待审批"
  preparingBatchOperationsForReview: "正在整理批量操作与审批内容"
  detailChangesCompleted: "已完成 {{value1}} 项变更"
  detailOperationsPreparedAwaitingApproval: "已生成 {{value1}} 项操作，等待审批"
  detailGenerating: "正在生成《{{value1}}》"
en:
  generateBatchPlan: "Generate batch plan"
  theseChangesWereCanceled: "These changes were canceled"
  applyBatchPlan: "Apply batch plan"
  changesInThisBatchUndone: "Changes in this batch undone"
  applyingApprovedChanges: "Applying approved changes"
  thisBatchOfChangesIsComplete: "This batch of changes is complete"
  planGeneratedAwaitingApproval: "Plan generated. Awaiting approval."
  preparingBatchOperationsForReview: "Preparing batch operations for review"
  detailChangesCompleted: "Changes completed: {{value1}}"
  detailOperationsPreparedAwaitingApproval: "Operations prepared: {{value1}}. Awaiting approval."
  detailGenerating: "Generating “{{value1}}”"
ja:
  generateBatchPlan: "一括プランを生成"
  theseChangesWereCanceled: "今回の変更をキャンセルしました"
  applyBatchPlan: "一括プランを実行"
  changesInThisBatchUndone: "この一括変更を取り消しました"
  applyingApprovedChanges: "承認済みの変更を実行中"
  thisBatchOfChangesIsComplete: "この一括変更は完了しました"
  planGeneratedAwaitingApproval: "プランを生成しました。承認待ちです"
  preparingBatchOperationsForReview: "一括操作と承認内容を整理しています"
  detailChangesCompleted: "{{value1}} 件の変更が完了しました"
  detailOperationsPreparedAwaitingApproval: "{{value1}} 件の操作を生成しました。承認待ちです"
  detailGenerating: "「{{value1}}」を生成中"
`;
const t = createTranslator(messages);

export function getBatchPlanProgressText(
  part: ToolProgressPart,
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  title: string,
): Pick<ProgressStep, "label" | "detail"> {
  const operationCount = Array.isArray(input?.operations)
    ? input.operations.length
    : Array.isArray(readObject(input?.plan)?.changes)
      ? (readObject(input?.plan)?.changes as unknown[]).length
      : 0;
  const destinations = batchPlanDestinations(input, output);
  const atDestinations = (text: string) => destinations ? `${text} · ${destinations}` : text;
  const executionFailed =
    part.state === "output-error" ||
    Boolean(part.errorText) ||
    (part.state === "output-available" && output?.ok === false);
  if (executionFailed) {
    return {
      get label() { return t("generateBatchPlan"); },
      detail: atDestinations(formatNotebookAiError(part.errorText || output?.error, {
        phase: part.approval?.approved === true ? "execute" : "prepare",
      })),
    };
  }
  if (
    part.state === "output-denied" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  ) {
    return { get label() { return t("generateBatchPlan"); }, get detail() { return t("theseChangesWereCanceled"); } };
  }
  if (output?.status === "undone") {
    return { get label() { return t("applyBatchPlan"); }, get detail() { return t("changesInThisBatchUndone"); } };
  }
  if (part.state === "approval-responded" && part.approval?.approved === true) {
    return { get label() { return t("applyBatchPlan"); }, get detail() { return t("applyingApprovedChanges"); } };
  }
  if (
    part.state === "output-available" &&
    output?.ok === true &&
    output?.status !== "prepared"
  ) {
    const appliedCount =
      typeof output.appliedCount === "number"
        ? output.appliedCount
        : operationCount;
    return {
      get label() { return t("applyBatchPlan"); },
      detail: atDestinations(appliedCount ? t("detailChangesCompleted", { value1: appliedCount }) : t("thisBatchOfChangesIsComplete")),
    };
  }
  if (
    part.state === "approval-requested" ||
    (part.state === "output-available" &&
      output?.status === "prepared" &&
      output?.needsApproval === true)
  ) {
    return {
      get label() { return t("generateBatchPlan"); },
      detail: atDestinations(operationCount
        ? t("detailOperationsPreparedAwaitingApproval", { value1: operationCount })
        : t("planGeneratedAwaitingApproval")),
    };
  }
  return {
    get label() { return t("generateBatchPlan"); },
    detail: title
      ? t("detailGenerating", { value1: truncate(title) })
      : t("preparingBatchOperationsForReview"),
  };
}
