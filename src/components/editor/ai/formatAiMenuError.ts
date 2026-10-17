import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";

import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/formatAiMenuError.ts#messages:1">`
zh-Hans:
  theTargetBlockHasChangedTheOriginalText: "目标块已变化，原文未修改。请重新选择后再试"
  thisModelSThinkingModeDoesNotSupport: "当前模型的思考模式不支持强制工具调用，请换非思考模型或关闭思考后再试"
  theApiKeyIsInvalidOrMissing: "密钥无效或未配置"
  theRequestFailedCheckYourConnectionOrBase: "网络请求失败，请检查网络或 Base URL"
  stopped: "已停止"
  theModelReturnedAnInvalidResponseTryAnother: "模型返回格式异常，请换模型或稍后再试"
en:
  theTargetBlockHasChangedTheOriginalText: "The target block has changed. The original text was preserved. Select it again and retry."
  thisModelSThinkingModeDoesNotSupport: "This model's thinking mode does not support required tool calls. Choose a non-thinking model or turn off thinking and retry."
  theApiKeyIsInvalidOrMissing: "The API key is invalid or missing"
  theRequestFailedCheckYourConnectionOrBase: "The request failed. Check your connection or Base URL."
  stopped: "Stopped"
  theModelReturnedAnInvalidResponseTryAnother: "The model returned an invalid response. Try another model or retry later."
ja:
  theTargetBlockHasChangedTheOriginalText: "対象のブロックが変更されました。元のテキストは変更されていません。選択し直してからもう一度お試しください"
  thisModelSThinkingModeDoesNotSupport: "現在のモデルの思考モードは、ツール呼び出しの強制に対応していません。思考なしのモデルに切り替えるか、思考をオフにしてからもう一度お試しください"
  theApiKeyIsInvalidOrMissing: "キーが無効か、設定されていません"
  theRequestFailedCheckYourConnectionOrBase: "ネットワークリクエストに失敗しました。ネットワークまたは Base URL を確認してください"
  stopped: "停止しました"
  theModelReturnedAnInvalidResponseTryAnother: "モデルが返した形式が正しくありません。別のモデルを使うか、しばらくしてからもう一度お試しください"
`;
const t = createTranslator(messages);
/**
 * 行内 AI 菜单错误文案。目标失效时保留原文并提示重新选择。
 */
export function isMissingTargetBlockError(error: unknown): boolean {
  const message = toErrorText(error).toLowerCase();
  if (!message) return false;
  return (
    message.includes("block not found") ||
    message.includes("target block is no longer") ||
    message.includes("找不到块") ||
    message.includes("目标块已不在")
  );
}

export function formatAiMenuError(error: unknown): string {
  const message = toErrorText(error);
  if (!message) return "";

  if (isMissingTargetBlockError(message)) {
    return t("theTargetBlockHasChangedTheOriginalText");
  }
  if (/tool_choice|Thinking mode/i.test(message)) {
    return t("thisModelSThinkingModeDoesNotSupport");
  }
  if (
    /\b401\b|\b403\b|unauthorized|forbidden|invalid.?api.?key|api.?key.*(invalid|missing|required)|incorrect.?api.?key|authentication/i.test(
      message,
    )
  ) {
    return t("theApiKeyIsInvalidOrMissing");
  }
  if (
    /network|fetch failed|failed to fetch|load failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|timeout|网路|网络/i.test(
      message,
    )
  ) {
    return t("theRequestFailedCheckYourConnectionOrBase");
  }
  if (/abort|cancel|停止/i.test(message)) {
    return t("stopped");
  }
  if (/invalid json response/i.test(message)) {
    return t("theModelReturnedAnInvalidResponseTryAnother");
  }
  return localizeNotebookAiDiagnostic(message);
}

function toErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error != null) {
    const text = String(error);
    if (text && text !== "[object Object]") return text;
  }
  return "";
}
