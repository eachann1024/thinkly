import { useLocale } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ArrowDown } from "@/components/ui/icons";
import { ThreadPrimitive } from "@assistant-ui/react";
import { FullscreenPreview } from "@/components/preview/FullscreenPreview";
import type { PreviewContent } from "@/lib/preview/previewAction";
import { cn } from "@/lib/utils";
import { AiOrbitMark } from "./orbit/AiOrbitMark";
import { AssistantUiThreadViewport } from "./AssistantUiThreadViewport";
import { ChatChrome } from "./beautiful-ui/ChatChrome";
import type { ChatMessagesProps } from "./messages/types";
import { ChatMessageRow } from "./messages/ChatMessageRow";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ChatMessages.tsx#messages:1">`
zh-Hans:
  howWouldYouLikeToEditThisNote: "想怎么修改这篇笔记？"
  polishThisText: "润色这段文字"
  turnIntoAChecklist: "整理成清单"
  extractKeyPoints: "提炼要点"
  scrollToBottom: "滚动到底部"
  detailSendSuggestion: "发送建议：{{value1}}"
en:
  howWouldYouLikeToEditThisNote: "How would you like to edit this note?"
  polishThisText: "Polish this text"
  turnIntoAChecklist: "Turn into a checklist"
  extractKeyPoints: "Extract key points"
  scrollToBottom: "Scroll to bottom"
  detailSendSuggestion: "Send suggestion: {{value1}}"
ja:
  howWouldYouLikeToEditThisNote: "このノートをどう編集しますか？"
  polishThisText: "文章を推敲"
  turnIntoAChecklist: "チェックリストにまとめる"
  extractKeyPoints: "要点を抽出"
  scrollToBottom: "一番下へスクロール"
  detailSendSuggestion: "提案を送信：{{value1}}"
`;
const t = createTranslator(messages);

export { buildUserMessageSegments } from "@/lib/notebook-ai/userMessageSegments";
export {
  ASSISTANT_TEXT_PARTS,
  ASSISTANT_APPROVAL_PARTS,
  ASSISTANT_ARTIFACT_PARTS,
} from "./messages/assistantParts";

export function ChatMessages({
  messages,
  streamingMessageId,
  editorRef,
  layout = "side-panel",
  onEmptySuggestion,
  onBatchApproval,
  onBatchUndo,
}: ChatMessagesProps) {
  useLocale();
  const isFullscreen = layout === "fullscreen";
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(
    null,
  );
  const messageIds = JSON.stringify(messages.map((message) => message.id));
  const messagePositions = useMemo(
    () => new Map<string, number>((JSON.parse(messageIds) as string[]).map((id, index) => [id, index])),
    [messageIds],
  );
  const day = new Date().toDateString();

  const toolRenderBase = useMemo(
    () => ({
      editorRef,
      onBatchApproval,
      onBatchUndo,
    }),
    [editorRef, onBatchApproval, onBatchUndo],
  );

  return (
    <ChatChrome className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <AssistantUiThreadViewport
        className={cn(
          "notebook-ai-messages min-w-0 flex-1 overflow-x-hidden overflow-y-scroll [scrollbar-width:thin]",
          messages.length === 0
            ? "relative flex min-h-0 flex-col pb-[var(--ai-composer-float-pad,7.5rem)]"
            : undefined,
          messages.length > 0
            ? isFullscreen
              ? "px-6 pt-5"
              : "px-3 pt-3"
            : undefined,
        )}
      >
        {messages.length === 0 ? (
          <div className="notebook-ai-empty-state relative min-h-0 w-full min-w-0">
            <AiOrbitMark variant="idle" />
            <h2 className="notebook-ai-empty-title text-foreground">
              {t("howWouldYouLikeToEditThisNote")}
            </h2>
            <div className="notebook-ai-empty-suggestions">
              {[{ label: t("polishThisText"), prompt: "润色这段文字" }, { label: t("turnIntoAChecklist"), prompt: "整理成清单" }, { label: t("extractKeyPoints"), prompt: "提炼要点" }].map(({ label: text, prompt }, index) => (
                <Button contentStyle="preserve" variant="ghost" size={null}
                  key={text}
                  type="button"
                  className="notebook-ai-empty-suggestion"
                  onClick={() => onEmptySuggestion?.(prompt)}
                  aria-label={t("detailSendSuggestion", { value1: text })}
                >
                  <span className="notebook-ai-empty-suggestion-index" aria-hidden="true">{index + 1}</span>
                  <span>{text}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto w-full min-w-0 max-w-full space-y-3",
              isFullscreen ? "max-w-[720px]" : "max-w-none",
            )}
          >
            <ThreadPrimitive.Messages>
              {({ message }) => {
                const index = messagePositions.get(message.id);
                if (index === undefined) return null;
                const sourceMessage = messages[index];
                return (
                  <ChatMessageRow
                    msg={sourceMessage}
                    previousAt={index > 0 ? messages[index - 1].metadata?.createdAt : undefined}
                    first={index === 0}
                    day={day}
                    isStreaming={streamingMessageId === sourceMessage.id}
                    toolRenderBase={toolRenderBase}
                    setPreviewContent={setPreviewContent}
                  />
                );
              }}
            </ThreadPrimitive.Messages>
            <ThreadPrimitive.ViewportFooter className="pointer-events-none sticky bottom-[calc(var(--ai-composer-float-pad,7.5rem)+12px)] z-10 flex h-0 justify-center overflow-visible">
              <ThreadPrimitive.ScrollToBottom render={<IconButton size="icon" tone="muted" />}
                className="pointer-events-auto -translate-y-10 border border-border bg-background text-muted-foreground shadow-sm disabled:hidden"
                aria-label={t("scrollToBottom")}
                title={t("scrollToBottom")}
              >
                <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
              </ThreadPrimitive.ScrollToBottom>
            </ThreadPrimitive.ViewportFooter>
            <div
              className="pointer-events-none h-[var(--ai-composer-float-pad,7.5rem)] shrink-0"
              aria-hidden
            />
          </div>
        )}
      </AssistantUiThreadViewport>
      <FullscreenPreview
        open={Boolean(previewContent)}
        content={previewContent}
        title={previewContent?.fileName}
        onClose={() => setPreviewContent(null)}
      />
    </ChatChrome>
  );
}
