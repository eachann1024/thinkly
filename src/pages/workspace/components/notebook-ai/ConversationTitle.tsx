import { useLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { isEmptyConversationSummary } from "@/lib/notebook-ai/conversationSummary";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ConversationTitle.tsx#messages:1">`
zh-Hans:
  newConversation: "新会话"
  detailConversationTitle: "会话标题：{{value1}}"
en:
  newConversation: "New conversation"
  detailConversationTitle: "Conversation title: {{value1}}"
ja:
  newConversation: "新しい会話"
  detailConversationTitle: "会話のタイトル：{{value1}}"
`;
const t = createTranslator(messages);


interface ConversationTitleProps {
  summary: string;
  className?: string;
  muted?: boolean;
}

export function ConversationTitle({
  summary,
  className,
  muted,
}: ConversationTitleProps) {
  useLocale();
  const display = summary.trim() || t("newConversation");
  const isMuted = muted ?? isEmptyConversationSummary(display);

  return (
    <h2
      key={display}
      className={cn(
        "notebook-ai-conversation-title min-w-0 flex-1 truncate whitespace-nowrap text-sm font-medium leading-5",
        isMuted ? "text-muted-foreground" : "text-foreground",
        className,
      )}
      title={display}
      aria-label={t("detailConversationTitle", { value1: display })}
    >
      {display}
    </h2>
  );
}
