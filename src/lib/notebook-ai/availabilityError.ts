
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/availabilityError.ts#messages:1">`
zh-Hans:
  authenticationFailedCheckTheCredentialsAndServiceUrl: "服务凭证未通过验证，请在 AI 设置中检查凭证与服务地址。"
  theAiServiceHasInsufficientCreditSwitchServices: "AI 服务额度不足，请在设置中切换服务，或到服务提供方管理额度。"
  tooManyRequestsToTheAiServicePlease: "AI 服务请求过于频繁，请稍后重试。"
  couldNotConnectToTheAiServiceCheck: "暂时无法连接 AI 服务，请检查网络，或稍后重试。"
  theAiServiceIsTemporarilyUnavailablePleaseTry: "AI 服务暂时不可用，请稍后重试。"
en:
  authenticationFailedCheckTheCredentialsAndServiceUrl: "Authentication failed. Check the credentials and service URL in AI settings."
  theAiServiceHasInsufficientCreditSwitchServices: "The AI service has insufficient credit. Switch services in Settings or manage credit with your provider."
  tooManyRequestsToTheAiServicePlease: "Too many requests to the AI service. Please try again later."
  couldNotConnectToTheAiServiceCheck: "Could not connect to the AI service. Check your connection or try again later."
  theAiServiceIsTemporarilyUnavailablePleaseTry: "The AI service is temporarily unavailable. Please try again later."
ja:
  authenticationFailedCheckTheCredentialsAndServiceUrl: "認証に失敗しました。AI 設定で認証情報とサービス URL を確認してください。"
  theAiServiceHasInsufficientCreditSwitchServices: "AI サービスのクレジットが不足しています。設定でサービスを切り替えるか、提供元でクレジットを管理してください。"
  tooManyRequestsToTheAiServicePlease: "AI サービスへのリクエストが多すぎます。しばらくしてからもう一度お試しください。"
  couldNotConnectToTheAiServiceCheck: "AI サービスに接続できません。ネットワークを確認するか、しばらくしてからもう一度お試しください。"
  theAiServiceIsTemporarilyUnavailablePleaseTry: "AI サービスは一時的に利用できません。しばらくしてからもう一度お試しください。"
`;
const t = createTranslator(messages);
/** 仅把明确的连接/鉴权/额度故障视为服务不可用，普通生成错误仍留在对话中。 */
export function getAiAvailabilityError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as {
    message?: string;
    statusCode?: number;
    cause?: unknown;
  };
  const message =
    typeof value.message === "string" ? value.message.toLowerCase() : "";
  if (
    value.statusCode === 401 ||
    /unauthorized|invalid api key|incorrect api key|authentication|api key required/.test(
      message,
    )
  ) {
    return t("authenticationFailedCheckTheCredentialsAndServiceUrl");
  }
  if (
    /insufficient_quota|insufficient quota|insufficient balance|credit balance|额度不足|余额不足/.test(
      message,
    )
  ) {
    return t("theAiServiceHasInsufficientCreditSwitchServices");
  }
  if (value.statusCode === 429) {
    return t("tooManyRequestsToTheAiServicePlease");
  }
  if (
    /failed to fetch|networkerror|load failed|fetch failed|network request failed|timeout|timed out|econnreset|econnrefused/.test(
      message,
    )
  ) {
    return t("couldNotConnectToTheAiServiceCheck");
  }
  if (value.statusCode && value.statusCode >= 500 && value.statusCode <= 599) {
    return t("theAiServiceIsTemporarilyUnavailablePleaseTry");
  }
  // SDK 的重试错误可能将原始 HTTP 故障放在 cause 中。
  if (value.cause && value.cause !== error) {
    const cause = value.cause as { statusCode?: number; message?: string };
    return getAiAvailabilityError({
      statusCode: cause.statusCode,
      message: cause.message,
    });
  }
  return undefined;
}

export function isRetryableAvailabilityError(error: unknown): boolean {
  const reason = getAiAvailabilityError(error);
  return Boolean(
    reason &&
    [
      t("couldNotConnectToTheAiServiceCheck"),
      t("tooManyRequestsToTheAiServicePlease"),
      t("theAiServiceIsTemporarilyUnavailablePleaseTry"),
    ].includes(reason),
  );
}
