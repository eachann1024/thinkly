import { useLocale } from "@/i18n";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ArrowDown } from "@/components/ui/icons";
import { DotDecor, EmptyStateArt } from "@/components/ui/dot-matrix";
import { ThreadPrimitive } from "@assistant-ui/react";
import {
  formatChatMessageTime,
  shouldShowChatTimeDivider,
} from "@/lib/notebook-ai/messageTime";
import { FullscreenPreview } from "@/components/preview/FullscreenPreview";
import type { PreviewContent } from "@/lib/preview/previewAction";
import { cn } from "@/lib/utils";
import { AssistantUiThreadViewport } from "./AssistantUiThreadViewport";
import { ChatChrome } from "./beautiful-ui/ChatChrome";
import { usePages } from "@/stores/usePages";
import { getPageTitle } from "@/components/editor/utils/page-title";
import type { ChatMessagesProps } from "./messages/types";
import { UserMessage } from "./messages/UserMessage";
import { AssistantMessage } from "./messages/AssistantMessage";
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
  const locale = useLocale();
  const isFullscreen = layout === "fullscreen";
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(
    null,
  );
  usePages((state) =>
    messages
      .flatMap((message) => message.metadata?.references ?? [])
      .map((reference) => {
        const page = state.pages[reference.pageId];
        return page ? getPageTitle(page) : reference.titleSnapshot;
      })
      .join("\u0000"),
  );
  const messageById = useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );

  const showTimeById = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];
      const previous = i > 0 ? messages[i - 1] : null;
      if (!shouldShowChatTimeDivider(current, previous)) continue;
      const at = current.metadata?.createdAt;
      if (typeof at !== "number") continue;
      const label = formatChatMessageTime(at);
      if (label) map.set(current.id, label);
    }
    return map;
  }, [messages, locale]);

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
            ? cn(
                "flex items-start justify-center pb-[var(--ai-composer-float-pad,7.5rem)]",
                isFullscreen ? "px-6 pt-5" : "p-0",
              )
            : undefined,
          messages.length > 0
            ? isFullscreen
              ? "px-6 pt-5"
              : "px-3 pt-3"
            : undefined,
        )}
      >
        {messages.length === 0 ? (
          <div
            className={cn(
              "notebook-ai-empty-state relative w-full min-w-0",
              isFullscreen && "notebook-ai-empty-state-fullscreen",
            )}
          >
            <DotDecor preset="aiChat" compact />
            <div className="notebook-ai-empty-mark" aria-hidden="true">
              <EmptyStateArt kind="emptyChat" />
            </div>
            <h2 className="notebook-ai-empty-title text-foreground">
              {t("howWouldYouLikeToEditThisNote")}
            </h2>
            <div className="notebook-ai-empty-suggestions">
              {[{ label: t("polishThisText"), prompt: "润色这段文字" }, { label: t("turnIntoAChecklist"), prompt: "整理成清单" }, { label: t("extractKeyPoints"), prompt: "提炼要点" }].map(({ label: text, prompt }) => (
                <Button contentStyle="preserve" variant="ghost" size={null}
                  key={text}
                  type="button"
                  className="notebook-ai-empty-suggestion"
                  onClick={() => onEmptySuggestion?.(prompt)}
                  aria-label={t("detailSendSuggestion", { value1: text })}
                >
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
                const sourceMessage = messageById.get(message.id);
                if (!sourceMessage) return null;
                const timeLabel = showTimeById.get(sourceMessage.id);
                const body =
                  sourceMessage.role === "user" ? (
                    <UserMessage
                      msg={sourceMessage}
                      setPreviewContent={setPreviewContent}
                    />
                  ) : (
                    <AssistantMessage
                      msg={sourceMessage}
                      isStreaming={streamingMessageId === sourceMessage.id}
                      toolRenderBase={toolRenderBase}
                    />
                  );
                return (
                  <>
                    {timeLabel ? (
                      <div
                        className="notebook-ai-message-time"
                        role="separator"
                        aria-label={timeLabel}
                      >
                        {timeLabel}
                      </div>
                    ) : null}
                    {body}
                  </>
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
