import type { Chat } from "@ai-sdk/react";
import type { ChatOnFinishCallback } from "ai";
import type { NotebookAiCompletion, NotebookAiMessage } from "@/lib/notebook-ai/types";
import { revokeRunWriteScope } from "@/lib/notebook-ai/resourceScope";

type SessionChat = Chat<NotebookAiMessage>;
type Finish = Parameters<ChatOnFinishCallback<NotebookAiMessage>>[0];
const stopReasons = new WeakMap<SessionChat, "stopped" | "timeout">();

export function stopSessionChat(chat: SessionChat, reason: "stopped" | "timeout") {
  if (chat.status !== "streaming" && chat.status !== "submitted") return;
  if (!stopReasons.has(chat)) stopReasons.set(chat, reason);
  const user = [...chat.messages].reverse().find((message) => message.role === "user");
  if (user?.metadata?.writeScope) revokeRunWriteScope(user.metadata.writeScope.runId);
  void chat.stop();
}

export function finishSessionChat(chat: SessionChat, finish: Finish) {
  const requestedStop = stopReasons.get(chat);
  stopReasons.delete(chat);
  let completion: NotebookAiCompletion;
  if (requestedStop) completion = requestedStop;
  else if (finish.isAbort) completion = "interrupted";
  else if (finish.isDisconnect) completion = "disconnected";
  else if (finish.isError || finish.finishReason === "error") completion = "error";
  else if (finish.finishReason === "length") completion = "limited";
  else if (finish.finishReason === "content-filter") completion = "blocked";
  else if (!finish.finishReason || finish.finishReason === "other") completion = "interrupted";
  else completion = "complete";

  const response = chat.messages.find((message) => message.id === finish.message.id) ?? finish.message;
  const completed: NotebookAiMessage = {
    ...response,
    metadata: { ...response.metadata, completion },
  };
  const exists = chat.messages.some((message) => message.id === completed.id);
  chat.messages = exists
    ? chat.messages.map((message) => message.id === completed.id ? completed : message)
    : [...chat.messages, completed];
  return chat.messages;
}
