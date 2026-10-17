import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";

import { i18nYaml, createTranslator, subscribeLanguage } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/errors.ts#messages:1">`
zh-Hans:
  aiStoppedBecauseItCouldNotGenerateA: "计划格式生成失败，AI 已停止执行。已执行 0 项，且没有写入。请重试，或切换模型后再试。"
  thisPlanCannotBeAppliedNoOperationsWere: "计划无法执行，已执行 0 项且没有写入。请调整目标后重试。"
  thePlanDidNotFinishRecoveryWasAttempted: "执行未完成，已尝试恢复。请检查相关页面后重试。"
  undoFailedThePagesMayHaveChangedCheck: "撤回失败，页面可能已发生变化。请检查页面后重试。"
  thisRequestFailedPleaseTryAgainLater: "本轮请求失败，请稍后重试。"
  thisBatchPlanDoesNotSupportThatOperation: "当前批量计划不支持本地文件夹页面的该操作，已执行 0 项且没有写入。"
  theNewPageSParentIsUnavailableNo: "新页面的父级不可用，已执行 0 项且没有写入。请换一个有效父页面后重试。"
  aPlanTargetIsUnavailableOrBelongsTo: "计划目标不可用或不属于当前笔记本，已执行 0 项且没有写入。请检查目标后重试。"
  selectAtLeastOneOperationAndRetryNothing: "请至少选择一项操作后重试；当前没有写入。"
  thePlanIsIncompleteNoOperationsWereApplied: "计划内容不完整，已执行 0 项且没有写入。请让 AI 重新生成计划。"
  theLocalFileCouldNotBeCreatedNo: "无法创建本地文件，已执行 0 项且没有写入。请检查同名文件后重试。"
  thePageContentHasChangedThisWriteWas: "页面内容已发生变化，为避免覆盖新的编辑，本次写入已取消"
  couldNotAuthenticateWithTheAiServiceCheck: "无法通过 AI 服务鉴权。请到「设置 → AI 助手」检查 API Key 与 Base URL。"
  couldNotConnectToTheAiServiceCheck: "无法连接 AI 服务。请检查 Base URL、网络或代理是否可达。"
  theCurrentAiProtocolCannotAccessTheResponses: "当前 AI 协议无法访问 Responses 接口，请确认服务端兼容 /v1/responses。"
en:
  aiStoppedBecauseItCouldNotGenerateA: "AI stopped because it could not generate a valid plan. No operations were applied and nothing was written. Retry or choose another model."
  thisPlanCannotBeAppliedNoOperationsWere: "This plan cannot be applied. No operations were applied and nothing was written. Adjust the targets and retry."
  thePlanDidNotFinishRecoveryWasAttempted: "The plan did not finish. Recovery was attempted. Check the affected pages before retrying."
  undoFailedThePagesMayHaveChangedCheck: "Undo failed. The pages may have changed. Check them before retrying."
  thisRequestFailedPleaseTryAgainLater: "This request failed. Please try again later."
  thisBatchPlanDoesNotSupportThatOperation: "This batch plan does not support that operation on local folder pages. No operations were applied and nothing was written."
  theNewPageSParentIsUnavailableNo: "The new page's parent is unavailable. No operations were applied and nothing was written. Choose a valid parent page and retry."
  aPlanTargetIsUnavailableOrBelongsTo: "A plan target is unavailable or belongs to another notebook. No operations were applied and nothing was written. Check the targets and retry."
  selectAtLeastOneOperationAndRetryNothing: "Select at least one operation and retry. Nothing has been written."
  thePlanIsIncompleteNoOperationsWereApplied: "The plan is incomplete. No operations were applied and nothing was written. Ask AI to regenerate it."
  theLocalFileCouldNotBeCreatedNo: "The local file could not be created. No operations were applied and nothing was written. Check for an existing file with the same name before retrying."
  thePageContentHasChangedThisWriteWas: "The page content has changed. This write was canceled to preserve newer edits."
  couldNotAuthenticateWithTheAiServiceCheck: "Could not authenticate with the AI service. Check the API key and Base URL in Settings → AI assistant."
  couldNotConnectToTheAiServiceCheck: "Could not connect to the AI service. Check the Base URL, connection, or proxy."
  theCurrentAiProtocolCannotAccessTheResponses: "The current AI protocol cannot access the Responses API. Check that the server supports /v1/responses."
ja:
  aiStoppedBecauseItCouldNotGenerateA: "プランの形式を生成できなかったため、AI は実行を停止しました。実行済みは 0 件で、書き込みも行われていません。もう一度お試しいただくか、モデルを切り替えてからやり直してください。"
  thisPlanCannotBeAppliedNoOperationsWere: "プランを実行できません。実行済みは 0 件で、書き込みも行われていません。対象を調整してからもう一度お試しください。"
  thePlanDidNotFinishRecoveryWasAttempted: "実行が完了しなかったため、復元を試みました。関連するページを確認してから、もう一度お試しください。"
  undoFailedThePagesMayHaveChangedCheck: "元に戻せませんでした。ページが変更されている可能性があります。ページを確認してから、もう一度お試しください。"
  thisRequestFailedPleaseTryAgainLater: "今回のリクエストに失敗しました。しばらくしてからもう一度お試しください。"
  thisBatchPlanDoesNotSupportThatOperation: "このバッチプランは、ローカルフォルダのページに対するその操作に対応していません。実行済みは 0 件で、書き込みも行われていません。"
  theNewPageSParentIsUnavailableNo: "新しいページの親を利用できません。実行済みは 0 件で、書き込みも行われていません。有効な親ページに変更してからもう一度お試しください。"
  aPlanTargetIsUnavailableOrBelongsTo: "プランの対象を利用できないか、現在のノートブックに属していません。実行済みは 0 件で、書き込みも行われていません。対象を確認してからもう一度お試しください。"
  selectAtLeastOneOperationAndRetryNothing: "操作を 1 件以上選択してから、もう一度お試しください。現在、書き込みは行われていません。"
  thePlanIsIncompleteNoOperationsWereApplied: "プランの内容が不完全です。実行済みは 0 件で、書き込みも行われていません。AI にプランを作り直させてください。"
  theLocalFileCouldNotBeCreatedNo: "ローカルファイルを作成できませんでした。実行済みは 0 件で、書き込みも行われていません。同名のファイルがないか確認してからもう一度お試しください。"
  thePageContentHasChangedThisWriteWas: "ページの内容が変更されたため、新しい編集を上書きしないよう今回の書き込みをキャンセルしました"
  couldNotAuthenticateWithTheAiServiceCheck: "AI サービスの認証に失敗しました。「設定 → AI アシスタント」で API キーと Base URL を確認してください。"
  couldNotConnectToTheAiServiceCheck: "AI サービスに接続できません。Base URL、ネットワーク、プロキシに到達できるか確認してください。"
  theCurrentAiProtocolCannotAccessTheResponses: "現在の AI プロトコルでは Responses API にアクセスできません。サーバーが /v1/responses に対応しているか確認してください。"
`;
const t = createTranslator(messages);
let BATCH_PLAN_SCHEMA_ERROR =
  t("aiStoppedBecauseItCouldNotGenerateA");
let BATCH_PLAN_BUSINESS_ERROR =
  t("thisPlanCannotBeAppliedNoOperationsWere");
let BATCH_PLAN_EXECUTION_ERROR =
  t("thePlanDidNotFinishRecoveryWasAttempted");
let UNDO_ERROR = t("undoFailedThePagesMayHaveChangedCheck");
let DEFAULT_ERROR = t("thisRequestFailedPleaseTryAgainLater");

function toText(error: unknown): string {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === "string") return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message.trim() : "";
  }
  return "";
}

/** 同一原因被分号叠多遍时只保留一条；多种原因按条列出。 */
export function collapseRepeatedErrorSegments(message: string): string {
  const text = message.trim();
  if (!text) return "";
  const parts = text
    .split("；")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return text;
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
  }
  if (unique.length === parts.length) return text;
  if (unique.length === 1) return unique[0];
  return unique.map((part, index) => `${index + 1}. ${part}`).join("\n");
}

export function formatBatchPlanErrors(errors: string[]): string {
  const unique: string[] = [];
  for (const error of errors) {
    const text = collapseRepeatedErrorSegments(error);
    if (text && !unique.includes(text)) unique.push(text);
  }
  if (unique.length <= 1) return unique[0] ?? "";
  return unique.map((text, index) => `${index + 1}. ${text}`).join("\n");
}

export function isNotebookAiBatchPlanSchemaError(error: unknown): boolean {
  const message = toText(error).toLowerCase();
  if (!message) return false;
  return [
    "zod",
    "schema",
    "invalid tool",
    "tool call",
    "tool arguments",
    "validation error",
    "invalid input",
    "expected object",
    "received null",
  ].some((token) => message.includes(token));
}

export function isNotebookAiBatchPlanBusinessError(error: unknown): boolean {
  const message = toText(error).toLowerCase();
  return Boolean(message) && !isNotebookAiBatchPlanSchemaError(message);
}

function batchBusinessMessage(message: string): string {
  if (message.includes("本地文件夹")) {
    return t("thisBatchPlanDoesNotSupportThatOperation");
  }
  if (
    message.includes("父级不存在") ||
    (message.includes("父级") && message.includes("不属于"))
  ) {
    return t("theNewPageSParentIsUnavailableNo");
  }
  if (
    message.includes("删除目标不存在") ||
    message.includes("不属于当前笔记本")
  ) {
    return t("aPlanTargetIsUnavailableOrBelongsTo");
  }
  if (message.includes("至少选择一项")) {
    return t("selectAtLeastOneOperationAndRetryNothing");
  }
  if (message.includes("参数不完整")) {
    return t("thePlanIsIncompleteNoOperationsWereApplied");
  }
  if (
    message.includes("本地新建目标") ||
    message.includes("创建本地文件") ||
    message.includes("创建页面失败")
  ) {
    return t("theLocalFileCouldNotBeCreatedNo");
  }
  return BATCH_PLAN_BUSINESS_ERROR;
}

export function formatNotebookAiError(
  error: unknown,
  options: {
    phase?: "prepare" | "execute" | "undo" | "chat";
  } = {},
): string {
  const message = collapseRepeatedErrorSegments(toText(error));
  const phase = options.phase ?? "chat";
  if (phase === "execute") {
    if (message.includes("页面内容已发生变化")) {
      return t("thePageContentHasChangedThisWriteWas");
    }
    return BATCH_PLAN_EXECUTION_ERROR;
  }
  if (phase === "undo") return UNDO_ERROR;
  if (phase === "prepare") {
    if (isNotebookAiBatchPlanSchemaError(message))
      return BATCH_PLAN_SCHEMA_ERROR;
    return batchBusinessMessage(message);
  }
  if (!message) return DEFAULT_ERROR;
  const lower = message.toLowerCase();
  if (
    lower.includes("api key required") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("authentication")
  ) {
    return t("couldNotAuthenticateWithTheAiServiceCheck");
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("timeout")
  ) {
    return t("couldNotConnectToTheAiServiceCheck");
  }
  if (
    lower.includes("responses") &&
    (lower.includes("404") ||
      lower.includes("not found") ||
      lower.includes("not supported"))
  ) {
    return t("theCurrentAiProtocolCannotAccessTheResponses");
  }
  const localized = localizeNotebookAiDiagnostic(message);
  return localized !== message ? localized : DEFAULT_ERROR;
}

export let NOTEBOOK_AI_BATCH_PLAN_SCHEMA_ERROR = BATCH_PLAN_SCHEMA_ERROR;
export let NOTEBOOK_AI_BATCH_PLAN_BUSINESS_ERROR = BATCH_PLAN_BUSINESS_ERROR;
export let NOTEBOOK_AI_BATCH_PLAN_EXECUTION_ERROR =
  BATCH_PLAN_EXECUTION_ERROR;

subscribeLanguage(() => {
  BATCH_PLAN_SCHEMA_ERROR = t("aiStoppedBecauseItCouldNotGenerateA");
  BATCH_PLAN_BUSINESS_ERROR = t("thisPlanCannotBeAppliedNoOperationsWere");
  BATCH_PLAN_EXECUTION_ERROR = t("thePlanDidNotFinishRecoveryWasAttempted");
  UNDO_ERROR = t("undoFailedThePagesMayHaveChangedCheck");
  DEFAULT_ERROR = t("thisRequestFailedPleaseTryAgainLater");
  NOTEBOOK_AI_BATCH_PLAN_SCHEMA_ERROR = BATCH_PLAN_SCHEMA_ERROR;
  NOTEBOOK_AI_BATCH_PLAN_BUSINESS_ERROR = BATCH_PLAN_BUSINESS_ERROR;
  NOTEBOOK_AI_BATCH_PLAN_EXECUTION_ERROR = BATCH_PLAN_EXECUTION_ERROR;
});
