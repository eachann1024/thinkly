import { toast } from "@/components/ui/sonner";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/history/historyActions.ts#messages:1">`
zh-Hans:
  newConversation: "新会话"
  confirmDeletion: "确认删除"
  conversationDeleted: "已删除会话"
  detailDeleteConversation: "删除会话「{{value1}}」？"
en:
  newConversation: "New conversation"
  confirmDeletion: "Confirm deletion"
  conversationDeleted: "Conversation deleted"
  detailDeleteConversation: "Delete conversation “{{value1}}”?"
ja:
  newConversation: "新しい会話"
  confirmDeletion: "削除の確認"
  conversationDeleted: "会話を削除しました"
  detailDeleteConversation: "会話「{{value1}}」を削除しますか？"
`;
const t = createTranslator(messages);

/** 正在等待 toast 确认的会话删除，防止重复触发 */
const conversationDeleteInFlight = new Set<string>();

/** 删除会话：走全局 sonner toast 确认，确认后回调执行真实删除 */
export function requestDeleteConversation(
  conversationId: string,
  summary: string,
  onConfirm: () => void,
) {
  if (conversationDeleteInFlight.has(conversationId)) return;
  const trimmedSummary = summary.trim() || t("newConversation");
  const displaySummary =
    trimmedSummary.length > 20
      ? `${trimmedSummary.slice(0, 20)}…`
      : trimmedSummary;
  const toastId = `delete-ai-conversation:${conversationId}`;

  // 从弹出确认 toast 起就占位，保证同一会话同时只有一个待确认 toast
  conversationDeleteInFlight.add(conversationId);
  toast.warning(t("detailDeleteConversation", { value1: displaySummary }), {
    id: toastId,
    duration: 8000,
    classNames: { actionButton: "goose-toast-action-danger" },
    onDismiss: () => {
      conversationDeleteInFlight.delete(conversationId);
    },
    onAutoClose: () => {
      conversationDeleteInFlight.delete(conversationId);
    },
    action: {
      get label() { return t("confirmDeletion"); },
      onClick: () => {
        try {
          onConfirm();
          toast.success(t("conversationDeleted"), { id: toastId });
        } finally {
          conversationDeleteInFlight.delete(conversationId);
        }
      },
    },
  });
}
