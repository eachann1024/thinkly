import type { ChatTransport, UIMessageChunk } from "ai";
import type { NotebookAiExecution, NotebookAiMessage } from "./types";
import { readExecutionSource } from "./executionSource";

export function finishExecutionDetails(execution: NotebookAiExecution, now = Date.now()): NotebookAiExecution {
  const endedAt = execution.endedAt ?? now;
  return {
    ...execution, endedAt,
    tools: Object.fromEntries(Object.entries(execution.tools).map(([id, tool]) => [
      id, tool.endedAt === undefined ? { ...tool, endedAt: Math.max(tool.startedAt, endedAt) } : tool,
    ])),
  };
}

// Capture observed wall time at the shared UI stream boundary for both runtimes.
// Historical messages without these measurements deliberately have no duration.
export function withExecutionDetails(
  transport: ChatTransport<NotebookAiMessage>,
  modelId: string,
): ChatTransport<NotebookAiMessage> {
  return {
    reconnectToStream: (options) => transport.reconnectToStream(options),
    async sendMessages(options) {
      let execution: NotebookAiExecution = { startedAt: Date.now(), modelId, tools: {}, sources: [] };
      const sourcePositions = new Map<string, number>();
      const stream = await transport.sendMessages(options);
      const snapshot = () => ({ ...execution, tools: { ...execution.tools } });
      return stream.pipeThrough(new TransformStream<UIMessageChunk, UIMessageChunk>({
        transform(chunk, controller) {
          const now = Date.now();
          let changed = false;
          if (chunk.type === "tool-input-available") {
            if (!execution.tools[chunk.toolCallId]) {
              execution.tools[chunk.toolCallId] = { startedAt: now, type: `tool-${chunk.toolName}` };
              changed = true;
            }
          } else if ((chunk.type === "tool-output-available" && !chunk.preliminary) ||
            chunk.type === "tool-output-error" || chunk.type === "tool-output-denied") {
            const tool = execution.tools[chunk.toolCallId];
            if (tool && !tool.endedAt) {
              execution.tools[chunk.toolCallId] = { ...tool, endedAt: now };
              changed = true;
            }
            if (chunk.type === "tool-output-available") {
              const source = readExecutionSource(tool?.type ?? "", chunk.output, chunk.toolCallId);
              if (source) {
                const sources = [...execution.sources!];
                const position = sourcePositions.get(source.id) ?? sources.length;
                sourcePositions.set(source.id, position);
                sources[position] = source;
                execution = { ...execution, sources };
                changed = true;
              }
            }
          }
          if (chunk.type === "finish" || chunk.type === "abort") {
            execution = finishExecutionDetails(execution, now);
            changed = true;
          }
          if (chunk.type === "start" || chunk.type === "finish") {
            const metadata = chunk.messageMetadata as NotebookAiMessage["metadata"];
            controller.enqueue({ ...chunk, messageMetadata: { ...metadata, execution: snapshot() } });
          } else {
            controller.enqueue(chunk);
            if (changed) controller.enqueue({ type: "message-metadata", messageMetadata: { execution: snapshot() } });
          }
        },
      }));
    },
  };
}
