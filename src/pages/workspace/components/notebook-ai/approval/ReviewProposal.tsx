import { useLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { usePages } from "@/stores/usePages";
import { usePlanReviewSelection } from "./PlanReviewContext";
import { planReviewState, reviewOutput } from "./reviewState";
import { readReviewPlan } from "./planReviewData";
import { ReviewOperation } from "./ReviewOperation";
import "./plan-review.css";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/approval/ReviewProposal.tsx#messages:1">`
zh-Hans:
  notApplied: "未执行"
  skipped: "已跳过"
  pending: "等待执行"
  failed: "失败"
  undone: "已撤回"
  rolledBack: "已恢复"
  needsReview: "请检查"
  applied: "已应用"
  deselectAll: "取消全选"
  selectAll: "全选"
  selectedCount: "已选 {{selected}} / {{total}} 项，未选项将跳过"
en:
  notApplied: "Not applied"
  skipped: "Skipped"
  pending: "Pending"
  failed: "Failed"
  undone: "Undone"
  rolledBack: "Rolled back"
  needsReview: "Needs review"
  applied: "Applied"
  deselectAll: "Deselect all"
  selectAll: "Select all"
  selectedCount: "{{selected}} of {{total}} selected; unselected operations will be skipped"
ja:
  notApplied: "未適用"
  skipped: "スキップ済み"
  pending: "適用待ち"
  failed: "失敗"
  undone: "取り消し済み"
  rolledBack: "元に戻しました"
  needsReview: "要確認"
  applied: "適用済み"
  deselectAll: "すべての選択を解除"
  selectAll: "すべて選択"
  selectedCount: "{{total}} 件中 {{selected}} 件を選択済み。未選択の操作はスキップされます"
`;
const t = createTranslator(messages);


export function ReviewProposal({
  part,
}: {
  part: {
    input?: unknown;
    output?: unknown;
    state?: string;
    toolCallId?: string;
    errorText?: string;
    approval?: { approved?: boolean };
  };
}) {
  useLocale();
  // 页面标题、路径与可导航状态跟随目标笔记的变化。
  usePages((state) => state.pages);
  const { input, journal } = readReviewPlan(part);
  const operations = input?.operations ?? [];
  const key = `${part.toolCallId ?? ""}:${input?.runId ?? ""}`;
  const { selectedIds, setSelectedIds, locked } = usePlanReviewSelection(
    key,
    operations.map((op) => op.operationId),
    journal?.selectedOperationIds,
  );
  const review = planReviewState(part, journal);
  const output = reviewOutput(part.output);
  const results =
    journal?.results ??
    (Array.isArray(output.results)
      ? (output.results as { operationId: string; ok: boolean }[])
      : []);
  const canSelect = review.phase === "approval" && !locked;
  if (!input) return null;
  const resultLabel = (id: string) => {
    if (review.phase === "approval" || review.phase === "preparing")
      return undefined;
    if (review.phase === "cancelled") return t("notApplied");
    const included =
      journal?.selectedOperationIds.includes(id) ??
      results.some((result) => result.operationId === id);
    if (!included && results.length) return t("skipped");
    const result = results.find((item) => item.operationId === id);
    if (!result) return review.phase === "executing" ? t("pending") : t("notApplied");
    if (!result.ok) return t("failed");
    if (review.phase === "undone") return t("undone");
    if (review.phase === "failed" || review.phase === "conflict")
      return review.rollback === "complete" ? t("rolledBack") : t("needsReview");
    return t("applied");
  };
  return (
    <div className="notebook-ai-work-proposal">
      <h4>{input.summary.trim() || input.title}</h4>
      {canSelect ? (
        <div className="notebook-ai-review-selection">
          <span>
            {t("selectedCount", { selected: selectedIds.length, total: operations.length })}
          </span>
          <Button contentStyle="preserve" variant="ghost" size={null}
            type="button"
            onClick={() =>
              setSelectedIds(
                selectedIds.length === operations.length
                  ? []
                  : operations.map((op) => op.operationId),
              )
            }
          >
            {selectedIds.length === operations.length ? t("deselectAll") : t("selectAll")}
          </Button>
        </div>
      ) : null}
      {operations.map((operation) => (
        <ReviewOperation
          key={operation.operationId}
          operation={operation}
          journal={journal}
          canSelect={canSelect}
          selected={selectedIds.includes(operation.operationId)}
          onSelect={() =>
            setSelectedIds(
              selectedIds.includes(operation.operationId)
                ? selectedIds.filter((id) => id !== operation.operationId)
                : [...selectedIds, operation.operationId],
            )
          }
          resultLabel={resultLabel(operation.operationId)}
        />
      ))}
    </div>
  );
}
