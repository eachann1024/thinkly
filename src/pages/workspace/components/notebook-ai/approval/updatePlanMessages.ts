import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { sanitizeNotebookAiMessages } from "@/lib/notebook-ai/messageUtils";

export function updatePlanMessages(
  messages: NotebookAiMessage[],
  toolCallId: string,
  update: (part: Record<string, unknown>) => Record<string, unknown>,
) {
  return sanitizeNotebookAiMessages(
    messages.map((message) => ({
      ...message,
      parts: (message.parts ?? []).map((part) =>
        typeof part === "object" &&
        part &&
        "toolCallId" in part &&
        part.toolCallId === toolCallId
          ? update(part as unknown as Record<string, unknown>)
          : part,
      ),
    })) as NotebookAiMessage[],
  );
}
