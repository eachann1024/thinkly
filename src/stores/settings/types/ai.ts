import type {
  AIReasoningLevel,
  AIProviderId,
  CustomAIProtocol,
  AIModelOption,
} from "@/lib/ai-provider";
import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_CLAUDE_BASE_URL,
  isAIProviderId,
  inferProviderIdFromSettings,
} from "@/lib/ai-provider";

export type AIAgentRuntime = "legacy" | "pi";

export interface AISettings {
  enabled: boolean;
  readGlobalPrompt: boolean;
  readLocalSkills: boolean;
  runtime: AIAgentRuntime;
  selectedModelId: string | null;
  workspaceSelectedModelId: string | null;
  workspaceReasoningLevel: AIReasoningLevel;
  customProviderId: AIProviderId;
  customProtocol: CustomAIProtocol;
  customOpenAIResponsesBaseURL: string;
  customOpenAIBaseURL: string;
  customClaudeBaseURL: string;
  customOpenAIResponsesApiKey: string;
  customOpenAIApiKey: string;
  customClaudeApiKey: string;
  customModelOptions: AIModelOption[];
  tinyfishApiKey: string;
}

export function normalizeAIModelOptions(
  modelOptions: AIModelOption[] | undefined,
): AIModelOption[] {
  if (!Array.isArray(modelOptions)) {
    return [];
  }

  return modelOptions
    .filter((item): item is AIModelOption =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id.trim() : "",
      label: typeof item.label === "string" ? item.label.trim() : "",
      description:
        typeof item.description === "string" && item.description.trim()
          ? item.description.trim()
          : undefined,
    }))
    .filter((item) => item.id && item.label);
}

export function normalizeAIBaseURL(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeAIApiKey(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function normalizeAIReasoningLevel(value: unknown): AIReasoningLevel {
  if (
    value === "default" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }
  return "default";
}

type NormalizableAISettings = Partial<
  Omit<AISettings, "workspaceReasoningLevel" | "customProviderId">
> & {
  workspaceReasoningLevel?: string;
  customProviderId?: string;
};

export function normalizeAISettings(
  ai: NormalizableAISettings | undefined,
): AISettings {
  const customModelOptions = normalizeAIModelOptions(ai?.customModelOptions);
  const storedSelectedModelId =
    typeof ai?.selectedModelId === "string" && ai.selectedModelId.trim()
      ? ai.selectedModelId.trim()
      : null;
  const storedWorkspaceSelectedModelId =
    typeof ai?.workspaceSelectedModelId === "string" &&
    ai.workspaceSelectedModelId.trim()
      ? ai.workspaceSelectedModelId.trim()
      : null;
  const legacyAI = (ai ?? {}) as Partial<AISettings> & {
    customBaseURL?: unknown;
    customApiKey?: unknown;
  };
  const legacyBaseURL =
    typeof legacyAI.customBaseURL === "string"
      ? legacyAI.customBaseURL.trim()
      : "";
  const legacyApiKey =
    typeof legacyAI.customApiKey === "string"
      ? legacyAI.customApiKey.trim()
      : "";
  const customProtocol: CustomAIProtocol =
    ai?.customProtocol === "openai-responses" ||
    ai?.customProtocol === "openai" ||
    ai?.customProtocol === "claude"
      ? ai.customProtocol
      : legacyApiKey || legacyBaseURL
        ? "openai"
        : "openai-responses";
  const selectedModelId =
    storedSelectedModelId &&
    (customModelOptions.length === 0 ||
      customModelOptions.some((item) => item.id === storedSelectedModelId))
      ? storedSelectedModelId
      : (customModelOptions[0]?.id ?? null);

  const runtime: AIAgentRuntime =
    ai?.runtime === "legacy" || ai?.runtime === "pi" ? ai.runtime : "pi";

  const customOpenAIResponsesBaseURL = normalizeAIBaseURL(
    ai?.customOpenAIResponsesBaseURL,
    customProtocol === "openai-responses" && legacyBaseURL
      ? legacyBaseURL
      : DEFAULT_OPENAI_BASE_URL,
  );
  const customOpenAIBaseURL = normalizeAIBaseURL(
    ai?.customOpenAIBaseURL,
    customProtocol === "openai" && legacyBaseURL
      ? legacyBaseURL
      : DEFAULT_OPENAI_BASE_URL,
  );
  const customClaudeBaseURL = normalizeAIBaseURL(
    ai?.customClaudeBaseURL,
    customProtocol === "claude" && legacyBaseURL
      ? legacyBaseURL
      : DEFAULT_CLAUDE_BASE_URL,
  );

  const customProviderId: AIProviderId = isAIProviderId(ai?.customProviderId)
    ? ai.customProviderId
    : inferProviderIdFromSettings({
        customProviderId: ai?.customProviderId,
        customProtocol,
        customOpenAIResponsesBaseURL,
        customOpenAIBaseURL,
        customClaudeBaseURL,
      });

  return {
    enabled: Boolean(ai?.enabled),
    readGlobalPrompt:
      typeof ai?.readGlobalPrompt === "boolean" ? ai.readGlobalPrompt : true,
    readLocalSkills:
      typeof ai?.readLocalSkills === "boolean" ? ai.readLocalSkills : true,
    runtime,
    selectedModelId,
    workspaceSelectedModelId: storedWorkspaceSelectedModelId,
    workspaceReasoningLevel: normalizeAIReasoningLevel(
      ai?.workspaceReasoningLevel,
    ),
    customProviderId,
    customProtocol,
    customOpenAIResponsesBaseURL,
    customOpenAIBaseURL,
    customClaudeBaseURL,
    customOpenAIResponsesApiKey: normalizeAIApiKey(
      ai?.customOpenAIResponsesApiKey,
      customProtocol === "openai-responses" ? legacyApiKey : "",
    ),
    customOpenAIApiKey: normalizeAIApiKey(
      ai?.customOpenAIApiKey,
      customProtocol === "openai" ? legacyApiKey : "",
    ),
    customClaudeApiKey: normalizeAIApiKey(
      ai?.customClaudeApiKey,
      customProtocol === "claude" ? legacyApiKey : "",
    ),
    customModelOptions,
    tinyfishApiKey: normalizeAIApiKey(ai?.tinyfishApiKey),
  };
}
