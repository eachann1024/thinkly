import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/ai-provider/providers/openaiResponses.ts#localMessages:1">`
zh-Hans:
  theCustomOpenaiResponsesModelRequestFailed: "请求自定义 OpenAI Responses 模型失败"
  theOpenaiResponsesStreamingRequestFailed: "OpenAI Responses 流式请求失败"
en:
  theCustomOpenaiResponsesModelRequestFailed: "The custom OpenAI Responses model request failed"
  theOpenaiResponsesStreamingRequestFailed: "The OpenAI Responses streaming request failed"
ja:
  theCustomOpenaiResponsesModelRequestFailed: "カスタム OpenAI Responses モデルへのリクエストに失敗しました"
  theOpenaiResponsesStreamingRequestFailed: "OpenAI Responses のストリーミングリクエストに失敗しました"
`;
const uiText = createTranslator(localMessages);
import type { AISettingsLike, AIMessage, AIStreamPhase, AIRequestOverrides } from "../types";
import {
  getCustomAIApiKey,
  getCustomAIBaseURL,
  getCustomSelectedModelId,
  getRequestReasoningLevel,
  readErrorMessage,
} from "../modelCatalog";
import { reasoningDeltaFromResponsesEvent } from "../streamReasoning";
import { readSSELines } from "../stream";

export async function handleOpenAIResponsesStream(
  settings: AISettingsLike,
  messages: AIMessage[],
  signal: AbortSignal,
  emit: (phase: AIStreamPhase, text: string, isReasoning: boolean) => void,
  requestOverrides?: AIRequestOverrides,
) {
  const protocol = "openai-responses" as const;
  const apiKey = getCustomAIApiKey(settings, protocol);
  const baseURL = getCustomAIBaseURL(settings, protocol).replace(/\/+$/, "");
  const modelId = getCustomSelectedModelId(settings, requestOverrides);
  const reasoningLevel = getRequestReasoningLevel(settings, requestOverrides);
  const instructions = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
  const input = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const body: Record<string, unknown> = {
    model: modelId,
    input,
    stream: true,
    store: false,
  };
  if (instructions) {
    body.instructions = instructions;
  }
  if (reasoningLevel) {
    body.reasoning = {
      effort: reasoningLevel,
      summary: "auto",
    };
  }

  const response = await fetch(`${baseURL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(errorMessage || uiText("theCustomOpenaiResponsesModelRequestFailed"));
  }

  let fullText = "";
  let fullReasoning = "";
  let streamError: string | null = null;

  for await (const line of readSSELines(response, signal)) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6);
    if (!data || data === "[DONE]") continue;

    try {
      const event = JSON.parse(data);
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
        fullText += event.delta;
        emit("generating", event.delta, false);
      } else {
        const reasoningDelta = reasoningDeltaFromResponsesEvent(event);
        if (reasoningDelta) {
          fullReasoning += reasoningDelta;
          emit("thinking", reasoningDelta, true);
        } else if (event.type === "error") {
          streamError =
            event.message || event.error?.message || uiText("theOpenaiResponsesStreamingRequestFailed");
        } else if (event.type === "response.failed") {
          streamError =
            event.response?.error?.message || uiText("theOpenaiResponsesStreamingRequestFailed");
        }
      }
    } catch {
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  return { text: fullText, reasoningText: fullReasoning };
}
