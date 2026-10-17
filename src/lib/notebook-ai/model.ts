import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  getCustomAIApiKey,
  getCustomAIBaseURL,
  resolveActiveProtocol,
} from "@/lib/ai-provider";
import { useSettings } from "@/stores/useSettings";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/model.ts#messages:1">`
zh-Hans:
  enableTheAiAssistantInSettingsToUse: "AI 功能未开启，请前往设置启用 AI 助手。"
  chooseAModelInSettingsBeforeUsingThe: "请在设置中选择一个模型后再使用 AI 笔记本功能。"
  detailCouldNotCreateAiModel: "构造模型失败：{{value1}}"
en:
  enableTheAiAssistantInSettingsToUse: "Enable the AI assistant in Settings to use this feature."
  chooseAModelInSettingsBeforeUsingThe: "Choose a model in Settings before using the AI notebook."
  detailCouldNotCreateAiModel: "Could not create AI model: {{value1}}"
ja:
  enableTheAiAssistantInSettingsToUse: "AI 機能が無効です。設定で AI アシスタントを有効にしてください。"
  chooseAModelInSettingsBeforeUsingThe: "AI ノートブック機能を使う前に、設定でモデルを選択してください。"
  detailCouldNotCreateAiModel: "モデルの構築に失敗しました：{{value1}}"
`;
const t = createTranslator(messages);


export type ModelAvailability =
  | { ok: true; model: LanguageModel }
  | { ok: false; reason: string };

/**
 * 从 settings 构造 LanguageModel。
 * 支持 OpenAI Responses、OpenAI 兼容和 Anthropic 三种自定义协议；
 * DeepSeek 等预设按模型分支协议。
 */
export function buildLanguageModel(): ModelAvailability {
  const ai = useSettings.getState().ai;

  if (!ai.enabled) {
    return { ok: false, get reason() { return t("enableTheAiAssistantInSettingsToUse"); } };
  }

  // 工作区覆盖只在模型仍存在于列表时生效，否则回退到设置里配置的默认模型。
  const workspaceOverride = ai.workspaceSelectedModelId?.trim();
  const workspaceOverrideValid =
    !!workspaceOverride &&
    ai.customModelOptions.some((option) => option.id === workspaceOverride);
  const modelId = (
    (workspaceOverrideValid ? workspaceOverride : null) ??
    ai.selectedModelId ??
    ""
  ).trim();
  if (!modelId) {
    return {
      ok: false,
      get reason() { return t("chooseAModelInSettingsBeforeUsingThe"); },
    };
  }

  try {
    const requestOverrides = { selectedModelId: modelId };
    const protocol = resolveActiveProtocol(ai, requestOverrides);
    const baseURL = getCustomAIBaseURL(ai, protocol).replace(/\/+$/, "");
    const apiKey = getCustomAIApiKey(ai, protocol) || "placeholder";

    if (protocol === "openai-responses") {
      const provider = createOpenAI({
        apiKey,
        baseURL,
      });
      return { ok: true, model: provider.responses(modelId) };
    }

    if (protocol === "claude") {
      const provider = createAnthropic({
        apiKey,
        baseURL,
        headers: {
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      return { ok: true, model: provider(modelId) };
    }

    const provider = createOpenAICompatible({
      name: "custom-openai",
      baseURL,
      apiKey,
    });
    return { ok: true, model: provider.chatModel(modelId) };
  } catch (err) {
    return {
      ok: false,
      reason: t("detailCouldNotCreateAiModel", { value1: err instanceof Error ? err.message : String(err) }),
    };
  }
}
