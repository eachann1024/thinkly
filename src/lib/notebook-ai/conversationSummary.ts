import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/lib/notebook-ai/conversationSummary.ts#messages:1">`
zh-Hans:
  newConversation: "新会话"
en:
  newConversation: "New conversation"
`;
const t = createTranslator(messages);


function getMessageText(message: NotebookAiMessage) {
  const textPart = message.parts?.find((part) => part.type === "text");
  return textPart && "text" in textPart && typeof textPart.text === "string"
    ? textPart.text
    : "";
}

function getUserDisplayText(message: NotebookAiMessage) {
  const displayText = message.metadata?.displayText?.trim();
  if (displayText) return displayText;

  const rawText = getMessageText(message).trim();
  const hiddenContextStart = rawText.indexOf("\n\n本轮笔记上下文：");
  if (rawText.startsWith("用户输入：") && hiddenContextStart > -1) {
    return rawText.slice("用户输入：".length, hiddenContextStart).trim();
  }
  return rawText.startsWith("用户输入：")
    ? rawText.slice("用户输入：".length).trim()
    : rawText;
}

/** 会话列表与面板顶栏共用：首条用户消息，否则「新会话」。 */
export function getConversationSummary(messages: NotebookAiMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  return firstUserMessage
    ? getUserDisplayText(firstUserMessage) || t("newConversation")
    : t("newConversation");
}

export function isEmptyConversationSummary(summary: string) {
  const trimmed = summary.trim();
  return trimmed.length === 0 || trimmed === "新会话" || trimmed === "New conversation";
}
