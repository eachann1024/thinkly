import { memo, useMemo } from "react";
import { useLocale } from "@/i18n";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { formatChatMessageTime, shouldShowChatTimeDivider } from "@/lib/notebook-ai/messageTime";
import type { AssistantToolRenderContextValue } from "./toolRenderContext";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";

const titles = new WeakMap<Page, string>();
function pageTitle(page: Page) {
  let title = titles.get(page);
  if (title === undefined) {
    title = getPageTitle(page);
    titles.set(page, title);
  }
  return title;
}

export const ChatMessageRow = memo(function ChatMessageRow({
  msg, previousAt, first, day, isStreaming, toolRenderBase, noteTitle,
}: {
  msg: NotebookAiMessage;
  previousAt: number | undefined;
  first: boolean;
  day: string;
  isStreaming: boolean;
  toolRenderBase: Omit<AssistantToolRenderContextValue, "isStreaming">;
  noteTitle?: string;
}) {
  const locale = useLocale();
  const references = msg.metadata?.references;
  const selectTitles = useMemo(() => {
    const refs = msg.role === "user" ? references ?? [] : [];
    return (state: ReturnType<typeof usePages.getState>) => JSON.stringify(
      refs.map((ref) => {
        const page = state.pages[ref.pageId];
        return page ? pageTitle(page) : ref.titleSnapshot;
      }),
    );
  }, [references, msg.role]);
  // Only this row reacts to changes in the titles it actually displays.
  usePages(selectTitles);
  const at = msg.metadata?.createdAt;
  const timeLabel = useMemo(() => {
    if (!shouldShowChatTimeDivider(
      { metadata: { createdAt: at } },
      first ? null : { metadata: { createdAt: previousAt } },
    ) || typeof at !== "number") return "";
    return formatChatMessageTime(at);
  }, [at, previousAt, first, locale, day]);

  return (
    <>
      {timeLabel ? (
        <div className="notebook-ai-message-time" role="separator" aria-label={timeLabel}>
          {timeLabel}
        </div>
      ) : null}
      {msg.role === "user" ? (
        <UserMessage msg={msg} noteTitle={noteTitle} />
      ) : (
        <AssistantMessage msg={msg} isStreaming={isStreaming} toolRenderBase={toolRenderBase} />
      )}
    </>
  );
});
