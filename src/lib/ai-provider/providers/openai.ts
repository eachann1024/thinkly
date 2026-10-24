import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/ai-provider/providers/openai.ts#localMessages:1">`
zh-Hans:
  theCustomOpenaiModelRequestFailed: "请求自定义 OpenAI 模型失败"
en:
  theCustomOpenaiModelRequestFailed: "The custom OpenAI model request failed"
ja:
  theCustomOpenaiModelRequestFailed: "カスタム OpenAI モデルへのリクエストに失敗しました"
`;
const uiText = createTranslator(localMessages);
import type { AISettingsLike, AIMessage, AIStreamPhase, AIRequestOverrides } from "../types";
import {
  getCustomAIApiKey,
  getCustomAIBaseURL,
  getCustomSelectedModelId,
  getCustomProviderOptions,
  readErrorMessage,
} from "../modelCatalog";
import { reasoningDeltaFromChatChoice } from "../streamReasoning";
import { readSSELines } from "../stream";

export async function handleOpenAIStream(
  settings: AISettingsLike,
  messages: AIMessage[],
  signal: AbortSignal,
  emit: (phase: AIStreamPhase, text: string, isReasoning: boolean) => void,
  requestOverrides?: AIRequestOverrides,
) {
  const protocol = "openai" as const;
  const apiKey = getCustomAIApiKey(settings, protocol);
  const baseURL = getCustomAIBaseURL(settings, protocol).replace(/\/+$/, "");
  const modelId = getCustomSelectedModelId(settings, requestOverrides);
  const options = getCustomProviderOptions(settings, requestOverrides);

  const body: Record<string, unknown> = {
    model: modelId,
    messages: messages,
    stream: true,
  };
  if (options?.openaiCompatible) {
    const openaiOpts = options.openaiCompatible as Record<string, unknown>;
    if (openaiOpts.reasoningEffort) {
      body.reasoning_effort = openaiOpts.reasoningEffort;
    }
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errMs = await readErrorMessage(response);
    throw new Error(errMs || uiText("theCustomOpenaiModelRequestFailed"));
  }

  let fullText = "";
  let fullReasoning = "";
  for await (const line of readSSELines(response, signal)) {
    if (line === "data: [DONE]") break;
    if (line.startsWith("data: ")) {
      const dataStr = line.slice(6);
      if (!dataStr) continue;
      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta;
        if (delta) {
          const reasoningDelta = reasoningDeltaFromChatChoice(delta);
          if (reasoningDelta) {
            fullReasoning += reasoningDelta;
            emit("thinking", reasoningDelta, true);
          }
          if (delta.content) {
            fullText += delta.content;
            emit("generating", delta.content, false);
          }
        }
      } catch {
      }
    }
  }
  return { text: fullText, reasoningText: fullReasoning };
}
