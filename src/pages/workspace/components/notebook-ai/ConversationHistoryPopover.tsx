import { useLocale } from "@/i18n";
import { FadeText } from "@/components/ui/fade-text";
import { formatConversationTime } from "./history/conversationTime";
import { IconButton } from "@/components/ui/icon-button";
import { PortalHoverTip } from "./history/PortalHoverTip";
import { requestDeleteConversation } from "./history/historyActions";
import { useMemo, useState, type MouseEvent } from "react";
import {
  Clock3,
  History as HistoryIcon,
  Trash2,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getConversationSummary } from "@/lib/notebook-ai/conversationSummary";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { cn } from "@/lib/utils";
import { DotIconArt } from "@/components/ui/dot-matrix";
import { presenceName, runWithPresence } from "@/lib/ui/presence";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/ConversationHistoryPopover.tsx#messages:1">`
zh-Hans:
  noPreviousConversations: "暂无历史会话"
  deleteConversation: "删除会话"
  conversationHistory: "历史会话"
en:
  noPreviousConversations: "No previous conversations"
  deleteConversation: "Delete conversation"
  conversationHistory: "Conversation history"
ja:
  noPreviousConversations: "過去の会話はありません"
  deleteConversation: "会話を削除"
  conversationHistory: "会話履歴"
`;
const t = createTranslator(messages);


export interface ConversationHistoryListProps {
  notebookId: string;
  onSelectConversation: (conversationId: string) => void;
  onDidSelect?: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  className?: string;
  compact?: boolean;
}

export interface ConversationHistoryPopoverProps {
  notebookId: string;
  onSelectConversation: (conversationId: string) => void;
  disabled?: boolean;
}

export function ConversationHistoryList({
  notebookId,
  onSelectConversation,
  onDidSelect,
  onDeleteConversation,
  className,
  compact = false,
}: ConversationHistoryListProps) {
  useLocale();
  const notebookChatState = useNotebookAiChats(
    (state) => state.chats[notebookId],
  );
  const activeConversationId = notebookChatState?.activeConversationId ?? null;
  const conversations = useMemo(
    () =>
      Object.values(notebookChatState?.conversations ?? {})
        .filter((conversation) => conversation.messages.length > 0)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [notebookChatState],
  );

  const selectConversation = (conversationId: string) => {
    if (conversationId !== activeConversationId) {
      onSelectConversation(conversationId);
    }
    onDidSelect?.();
  };

  const confirmDeleteConversation = (
    event: MouseEvent<HTMLElement>,
    conversationId: string,
    summary: string,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    if (!onDeleteConversation) return;
    requestDeleteConversation(conversationId, summary, () => {
      runWithPresence(() => onDeleteConversation(conversationId));
    });
  };

  if (conversations.length === 0) {
    return (
      <div
        className={
          className ??
          "flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-muted-foreground"
        }
      >
        <DotIconArt icon="chat" size={24} width={24} height={24} />
        <span className="text-xs">{t("noPreviousConversations")}</span>
      </div>
    );
  }

  const list = (
    <div className="goose-list-layout min-w-0 max-w-full overflow-x-hidden">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        const summary = getConversationSummary(conversation.messages);

        return (
          <PortalHoverTip key={conversation.id} content={summary}>
            {({ onMouseEnter, onMouseLeave }) => (
              <div
                role="button"
                tabIndex={0}
                style={{ viewTransitionName: presenceName("chat", conversation.id) }}
                onClick={() => selectConversation(conversation.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectConversation(conversation.id);
                }}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="goose-menu-item goose-menu-item-multiline goose-list-row goose-accent-selection group flex w-full min-w-0 max-w-full cursor-pointer flex-col items-stretch gap-1 overflow-hidden rounded-[var(--goose-control-radius)] px-2.5 py-2 text-left text-foreground transition-colors "
                data-selected={isActive || undefined}
                aria-current={isActive ? "true" : undefined}
              >
                <FadeText className="w-full goose-menu-title">{summary}</FadeText>
                <div className="flex min-w-0 w-full items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1 goose-menu-description">
                    <Clock3 className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    <span className="goose-tabular min-w-0 [overflow-wrap:anywhere]">
                      {formatConversationTime(conversation.updatedAt)}
                    </span>
                  </div>
                  {onDeleteConversation ? (
                    <IconButton size="xs" tone="danger"
                      type="button"
                      aria-label={t("deleteConversation")}
                      title={t("deleteConversation")}
                      onClick={(event) =>
                        confirmDeleteConversation(event, conversation.id, summary)
                      }
                      className="flex shrink-0 items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </IconButton>
                  ) : null}
                </div>
              </div>
            )}
          </PortalHoverTip>
        );
      })}
    </div>
  );

  if (compact) {
    return <div className={cn("min-w-0 max-w-full", className)}>{list}</div>;
  }

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-x-hidden overflow-y-auto",
        className,
      )}
      style={{ maxHeight: 300 }}
    >
      {list}
    </div>
  );
}

export function ConversationHistoryPopover({
  notebookId,
  onSelectConversation,
  disabled = false,
}: ConversationHistoryPopoverProps) {
  useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(nextOpen) => {
        if (!disabled) setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <IconButton size="sm" tone="muted"
          type="button"
          className="flex items-center justify-center text-muted-foreground disabled:pointer-events-none disabled:text-disabled "
          aria-label={t("conversationHistory")}
          title={t("conversationHistory")}
          disabled={disabled}
        >
          <HistoryIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        variant="menu"
        align="end"
        sideOffset={6}
        className="w-[22rem] max-w-[calc(100vw-24px)] overflow-hidden p-[var(--goose-menu-surface-inset)]"
      >
        <ConversationHistoryList
          notebookId={notebookId}
          onSelectConversation={onSelectConversation}
          onDidSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
