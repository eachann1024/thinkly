import { useLocale } from "@/i18n";
import { getUserDisplayText } from "./messages/messagePresentation";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/AssistantUiRuntimeProvider.tsx#messages:1">`
zh-Hans:
  detailImage: "图片 {{value1}}"
  compactedSummary: "会话已压缩。后续提问会基于这份摘要继续。"
en:
  detailImage: "Image {{value1}}"
  compactedSummary: "Conversation compacted. Future replies will use this summary as context."
`;
const t = createTranslator(messages);
/**
 * assistant-ui 外部运行时适配。
 *
 * useChat/messages 仍是唯一业务真源；assistant-ui 只读取同一份消息并负责
 * Thread / Message / Composer primitives 的语义、可访问性和视口状态。
 */
import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { isNotebookAiToolPart } from "@/lib/notebook-ai/messageUtils";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import {
  createAiMessageProjector,
  type AssistantUiMessageProjection,
} from "./aiMessageProjection";

interface NotebookAiAssistantRuntimeProviderProps {
  messages: NotebookAiMessage[];
  isRunning: boolean;
  isDisabled: boolean;
  onCancel: () => void;
  children: ReactNode;
}

function getAssistantDisplayText(message: NotebookAiMessage, text: string): string {
  const prefix = "会话已压缩。后续提问会基于这份摘要继续。";
  return message.metadata?.compacted && text.startsWith(prefix)
    ? t("compactedSummary") + text.slice(prefix.length)
    : text;
}

function toJsonObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return input === undefined ? {} : { value: input };
}

function safeJsonStringify(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function convertNotebookAiMessage(
  projection: AssistantUiMessageProjection,
): ThreadMessageLike {
  const { message, isRunning } = projection;
  const content: Array<Exclude<ThreadMessageLike["content"], string>[number]> =
    [];

  for (let index = 0; index < (message.parts ?? []).length; index += 1) {
    const part = message.parts?.[index];
    if (!part) continue;

    if (part.type === "text") {
      content.push({
        type: "text",
        text:
          message.role === "user"
            ? getUserDisplayText(message)
            : getAssistantDisplayText(message, String(part.text)),
      });
      continue;
    }

    if (part.type === "reasoning") {
      content.push({ type: "reasoning", text: String(part.text) });
      continue;
    }

    if (!isNotebookAiToolPart(part)) continue;
    const args = toJsonObject(part.input);
    content.push({
      type: "tool-call",
      toolCallId: part.toolCallId ?? `${message.id}-tool-${index}`,
      toolName: part.type.slice("tool-".length),
      args: args as never,
      argsText: safeJsonStringify(args),
      artifact: part,
      ...(part.output !== undefined ? { result: part.output } : {}),
      ...(part.state === "output-error" || part.errorText
        ? { isError: true }
        : {}),
    });
  }

  const liveImageParts = (message.parts ?? []).filter(
    (
      part,
    ): part is {
      type: "file";
      url: string;
      filename?: string;
      mediaType: string;
    } =>
      part.type === "file" &&
      "url" in part &&
      typeof part.url === "string" &&
      "mediaType" in part &&
      typeof part.mediaType === "string" &&
      part.mediaType.startsWith("image/"),
  );

  const attachments = liveImageParts.map((part, index) => ({
    id: `${message.id}-attachment-${index}`,
    type: "image" as const,
    name: part.filename ?? t("detailImage", { value1: index + 1 }),
    contentType: part.mediaType,
    status: { type: "complete" as const },
    content: [
      {
        type: "image" as const,
        image: part.url,
        filename: part.filename,
      },
    ],
  }));

  return {
    id: message.id,
    role: message.role,
    content,
    ...(message.role === "user" && attachments.length > 0
      ? { attachments }
      : {}),
    ...(message.role === "assistant"
      ? {
          status: isRunning
            ? ({ type: "running" } as const)
            : ({ type: "complete", reason: "stop" } as const),
        }
      : {}),
  };
}

export function NotebookAiAssistantRuntimeProvider({
  messages,
  isRunning,
  isDisabled,
  onCancel,
  children,
}: NotebookAiAssistantRuntimeProviderProps) {
  const locale = useLocale();
  const projectMessages = useMemo(() => createAiMessageProjector(), [locale]);
  const projectedMessages = useMemo(
    () => projectMessages(messages, isRunning),
    [messages, isRunning, projectMessages],
  );

  const runtime = useExternalStoreRuntime({
    messages: projectedMessages,
    convertMessage: convertNotebookAiMessage,
    isRunning,
    isSendDisabled: isDisabled || isRunning,
    onNew: async () => {
      // Composer 正文由 AiComposerInput 管理；不会从 assistant-ui 发起提交。
    },
    onCancel: async () => onCancel(),
    unstable_capabilities: { copy: true },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
