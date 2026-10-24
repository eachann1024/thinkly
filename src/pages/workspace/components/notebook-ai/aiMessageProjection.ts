import type { NotebookAiMessage } from "@/lib/notebook-ai/types";

export interface AssistantUiMessageProjection {
  message: NotebookAiMessage;
  isRunning: boolean;
}

export function createAiMessageProjector() {
  const projections = new WeakMap<
    NotebookAiMessage,
    AssistantUiMessageProjection
  >();
  return (messages: NotebookAiMessage[], isRunning: boolean) =>
    messages.map((message, index) => {
      const running =
        isRunning &&
        index === messages.length - 1 &&
        message.role === "assistant";
      const previous = projections.get(message);
      if (previous?.isRunning === running) return previous;
      const projection = { message, isRunning: running };
      projections.set(message, projection);
      return projection;
    });
}
