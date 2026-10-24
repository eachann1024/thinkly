import { createTranslator, i18nYaml } from "@/i18n/core";
const messages = i18nYaml<"src/lib/setupGuideAI.ts#messages:1">`
zh-Hans:
  redacted: "[已隐藏]"
en:
  redacted: "[redacted]"
ja:
  redacted: "[非表示]"
`;
const t = createTranslator(messages);

export interface SetupGuideAIConnection {
  providerId: string;
  baseURL: string;
  apiKey: string;
}

export interface SetupGuideAIStatus {
  busy: boolean;
  dirty: boolean;
  ready: boolean;
}

export function areSetupGuideAIConnectionsEqual(
  first: SetupGuideAIConnection,
  second: SetupGuideAIConnection,
): boolean {
  return (
    first.providerId === second.providerId &&
    normalizeBaseURL(first.baseURL) === normalizeBaseURL(second.baseURL) &&
    first.apiKey.trim() === second.apiKey.trim()
  );
}

export function getSetupGuideAIStatus(input: {
  busy: boolean;
  draft: SetupGuideAIConnection;
  saved: SetupGuideAIConnection;
  selectedModelId: string | null;
  modelOptions: Array<{ id: string }>;
}): SetupGuideAIStatus {
  const dirty = !areSetupGuideAIConnectionsEqual(input.draft, input.saved);
  const selectedModelId = input.selectedModelId?.trim() ?? "";
  const ready =
    !dirty &&
    Boolean(
      input.saved.apiKey.trim() &&
        normalizeBaseURL(input.saved.baseURL) &&
        selectedModelId &&
        input.modelOptions.some((model) => model.id === selectedModelId),
    );

  return { busy: input.busy, dirty, ready };
}

export function canTestSetupGuideAI(
  enabled: boolean,
  status: SetupGuideAIStatus,
): boolean {
  return enabled && !status.busy && !status.dirty && status.ready;
}

export function isSetupGuideAIRequestCurrent(input: {
  requestId: number;
  currentRequestId: number;
  alive: boolean;
  signal: AbortSignal;
}): boolean {
  return (
    input.alive &&
    input.requestId === input.currentRequestId &&
    !input.signal.aborted
  );
}

export function hasValidSetupGuideAIResponse(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function redactSetupGuideAIError(
  message: string,
  apiKey: string,
): string {
  let safeMessage = message;
  const key = apiKey.trim();
  if (!key) return safeMessage;

  const variants = new Set([key, JSON.stringify(key).slice(1, -1), key.toLowerCase()]);
  try {
    variants.add(encodeURIComponent(key));
  } catch {
  }
  for (const variant of variants) {
    if (variant) safeMessage = safeMessage.split(variant).join(t("redacted"));
  }
  return safeMessage.length > 240 ? `${safeMessage.slice(0, 237)}…` : safeMessage;
}

function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
