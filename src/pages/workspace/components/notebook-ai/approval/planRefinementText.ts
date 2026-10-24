import { createTranslator, i18nYaml } from "@/i18n";
import { isNotebookAiBatchPlanSchemaError } from "@/lib/notebook-ai/errors";
import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";

const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/approval/planRefinementText.ts#messages:1">`
zh-Hans:
  refine: "请重新读取方案「{{title}}」的目标笔记，核对已完成的操作，并基于当前内容重新生成待确认方案，避免重复修改。"
  invalidPlan: "方案参数不完整或格式不正确，请检查目标位置后重新生成方案。"
en:
  refine: "Reread the target notes for ‘{{title}}’, check which changes were completed, and prepare a new plan for confirmation based on their current content. Avoid repeating completed changes."
  invalidPlan: "The plan parameters are incomplete or invalid. Check the target location and regenerate the plan."
ja:
  refine: "プラン「{{title}}」の対象ノートを読み直し、完了済みの操作を確認したうえで、現在の内容に基づく確認用プランを再生成してください。完了済みの変更は繰り返さないでください。"
  invalidPlan: "プランのパラメーターが不完全または無効です。対象の場所を確認してプランを再生成してください。"
`;
const t = createTranslator(messages);

export function planRefinementText(title: string): string {
  return t("refine", { title });
}

export function planReviewReason(error: string): string {
  return isNotebookAiBatchPlanSchemaError(error)
    ? t("invalidPlan")
    : localizeNotebookAiDiagnostic(error);
}
