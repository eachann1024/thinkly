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
    return "服务凭证未通过验证，请在 AI 设置中检查凭证与服务地址。";
  }
  if (
    /insufficient_quota|insufficient quota|insufficient balance|credit balance|额度不足|余额不足/.test(
      message,
    )
  ) {
    return "AI 服务额度不足，请在设置中切换服务，或到服务提供方管理额度。";
  }
  if (value.statusCode === 429) {
    return "AI 服务请求过于频繁，请稍后重试。";
  }
  if (
    /failed to fetch|networkerror|load failed|fetch failed|network request failed|timeout|timed out|econnreset|econnrefused/.test(
      message,
    )
  ) {
    return "暂时无法连接 AI 服务，请检查网络，或稍后重试。";
  }
  if (value.statusCode && value.statusCode >= 500 && value.statusCode <= 599) {
    return "AI 服务暂时不可用，请稍后重试。";
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
    (reason.startsWith("暂时无法连接") ||
      reason.includes("请求过于频繁") ||
      reason.startsWith("AI 服务暂时不可用")),
  );
}
