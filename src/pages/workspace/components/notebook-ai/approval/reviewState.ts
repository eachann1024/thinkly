import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";
import type { BatchPlanJournal } from "@/lib/notebook-ai/batch-plan/types";
import { collapseRepeatedErrorSegments } from "@/lib/notebook-ai/errors";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/approval/reviewState.ts#messages:1">`
zh-Hans:
  generatingPlan: "正在生成方案"
  awaitingApproval: "等待确认"
  applying: "正在应用"
  applied: "已应用"
  canceled: "已取消"
  undone: "已撤回"
  undoConflict: "撤回冲突"
  contentConflict: "原文冲突"
  invalidPlan: "方案无效"
  incomplete: "执行未完成"
  planGeneratedNoNotesHaveBeenChangedYet: "方案已生成，尚未修改笔记。"
  applyingSelectedChangesPleaseWait: "正在应用已选操作，请稍候。"
  thisPlanWasNotAppliedNoNotesWere: "本方案未执行，笔记未修改。"
  theseChangesHaveBeenUndone: "本次变更已撤回。"
  theNotesChangedAfterThePlanWasApplied: "笔记在应用后发生变化，未覆盖后续编辑。"
  theOriginalContentOrTargetLocationHasChanged: "原文或目标位置已变化，请基于当前笔记重新生成方案。"
  thisPlanCouldNotBeAppliedNoNotes: "方案无法执行，尚未写入笔记。"
  thePlanWasNotCompletedPreviouslyAppliedChanges: "执行未完成，已恢复此前成功的操作。"
  thePlanWasNotCompletedAndSomeChanges: "执行未完成，部分操作未能恢复，请检查目标笔记。"
  thePlanWasNotCompletedCheckTheTarget: "执行未完成，请检查目标笔记后调整方案。"
  preparingChanges: "正在整理变更内容。"
  appliedSelection: "已应用所选操作。"
  appliedCount: "已应用 {{count}} 项操作。"
en:
  generatingPlan: "Generating plan"
  awaitingApproval: "Awaiting approval"
  applying: "Applying"
  applied: "Applied"
  canceled: "Canceled"
  undone: "Undone"
  undoConflict: "Undo conflict"
  contentConflict: "Content conflict"
  invalidPlan: "Invalid plan"
  incomplete: "Incomplete"
  planGeneratedNoNotesHaveBeenChangedYet: "Plan generated. No notes have been changed yet."
  applyingSelectedChangesPleaseWait: "Applying selected changes. Please wait."
  thisPlanWasNotAppliedNoNotesWere: "This plan was not applied. No notes were changed."
  theseChangesHaveBeenUndone: "These changes have been undone."
  theNotesChangedAfterThePlanWasApplied: "The notes changed after the plan was applied. Later edits were preserved."
  theOriginalContentOrTargetLocationHasChanged: "The original content or target location has changed. Generate a new plan based on the current notes."
  thisPlanCouldNotBeAppliedNoNotes: "This plan could not be applied. No notes have been changed."
  thePlanWasNotCompletedPreviouslyAppliedChanges: "The plan was not completed. Previously applied changes were rolled back."
  thePlanWasNotCompletedAndSomeChanges: "The plan was not completed, and some changes could not be rolled back. Check the target notes."
  thePlanWasNotCompletedCheckTheTarget: "The plan was not completed. Check the target notes and revise the plan."
  preparingChanges: "Preparing changes."
  appliedSelection: "Selected changes applied."
  appliedCount: "Changes applied: {{count}}."
`;
const t = createTranslator(messages);


export type PlanReviewPhase =
  | "preparing"
  | "approval"
  | "executing"
  | "applied"
  | "cancelled"
  | "undone"
  | "conflict"
  | "invalid"
  | "failed";
type ReviewPart = {
  state?: string;
  output?: unknown;
  errorText?: string;
  approval?: { approved?: boolean };
};
export function reviewOutput(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function isPlanConflict(error: string): boolean {
  return /page content has changed|changed after approval|already modified|has changed|refus.*overwrit|path.*changed|already exists|no longer exists|has been deleted|page.*does not exist|notebook.*does not exist|页面内容已发生变化|审批后发生变化|已被修改|已变化|拒绝覆盖|路径.*变化|已被占用|已不存在|已被删除|页面.*不存在|笔记本.*不存在/i.test(
    error,
  );
}
export function planReviewState(
  part: ReviewPart,
  journal?: BatchPlanJournal | null,
) {
  const output = reviewOutput(part.output);
  const status = journal?.status ?? output.status;
  const error = collapseRepeatedErrorSegments(
    String(part.errorText || journal?.error || output.error || ""),
  );
  let phase: PlanReviewPhase = "preparing";
  if (
    part.state === "output-denied" ||
    (part.state === "approval-responded" && part.approval?.approved === false)
  )
    phase = "cancelled";
  else if (status === "undone") phase = "undone";
  else if (status === "undo-conflicted") phase = "conflict";
  else if (status === "invalid") phase = "invalid";
  else if (
    part.state === "output-error" ||
    part.errorText ||
    status === "failed" ||
    output.ok === false
  )
    phase = isPlanConflict(error) ? "conflict" : "failed";
  else if (part.state === "approval-responded" || status === "executing")
    phase = "executing";
  else if (
    part.state === "approval-requested" ||
    (status === "prepared" && output.needsApproval === true)
  )
    phase = "approval";
  else if (
    status === "completed" ||
    (part.state === "output-available" && output.ok === true)
  )
    phase = "applied";
  const selectedCount =
    journal?.selectedOperationIds.length ??
    (typeof output.selectedCount === "number"
      ? output.selectedCount
      : undefined);
  const appliedCount =
    phase === "applied"
      ? (journal?.results.filter((result) => result.ok).length ??
        (typeof output.appliedCount === "number"
          ? output.appliedCount
          : undefined))
      : 0;
  const label: Record<PlanReviewPhase, string> = {
    get preparing() { return t("generatingPlan"); },
    get approval() { return t("awaitingApproval"); },
    get executing() { return t("applying"); },
    get applied() { return t("applied"); },
    get cancelled() { return t("canceled"); },
    get undone() { return t("undone"); },
    conflict: status === "undo-conflicted" ? t("undoConflict") : t("contentConflict"),
    get invalid() { return t("invalidPlan"); },
    get failed() { return t("incomplete"); },
  };
  const rollback = journal?.rollbackStatus ?? output.rollbackStatus;
  const detail =
    phase === "approval"
      ? t("planGeneratedNoNotesHaveBeenChangedYet")
      : phase === "executing"
        ? t("applyingSelectedChangesPleaseWait")
        : phase === "applied"
          ? appliedCount === undefined ? t("appliedSelection") : t("appliedCount", { count: appliedCount })
          : phase === "cancelled"
            ? t("thisPlanWasNotAppliedNoNotesWere")
            : phase === "undone"
              ? t("theseChangesHaveBeenUndone")
              : phase === "conflict"
                ? status === "undo-conflicted"
                  ? t("theNotesChangedAfterThePlanWasApplied")
                  : t("theOriginalContentOrTargetLocationHasChanged")
                : phase === "invalid"
                  ? t("thisPlanCouldNotBeAppliedNoNotes")
                  : phase === "failed"
                    ? rollback === "complete"
                      ? t("thePlanWasNotCompletedPreviouslyAppliedChanges")
                      : rollback === "incomplete"
                        ? t("thePlanWasNotCompletedAndSomeChanges")
                        : t("thePlanWasNotCompletedCheckTheTarget")
                    : t("preparingChanges");
  return {
    phase,
    label: label[phase],
    detail,
    error: localizeNotebookAiDiagnostic(error),
    selectedCount,
    appliedCount,
    rollback,
  };
}
