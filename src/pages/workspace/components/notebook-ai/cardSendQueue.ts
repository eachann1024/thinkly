/** 面板外（搜索回答）的卡片点选：暂存一句待发消息，AI 面板切到对应会话、空闲后自动发出。 */
export const CARD_SEND_EVENT = "goose-note:card-send";

export type PendingCardSend = { notebookId: string; conversationId?: string; text: string };

/** 面板迟迟没有接手（会话切换失败等）时丢弃，避免日后误发。 */
const PENDING_TTL_MS = 15_000;
let pending: (PendingCardSend & { at: number }) | null = null;

export function queueCardSend(request: PendingCardSend): void {
  pending = { ...request, at: Date.now() };
  window.dispatchEvent(new CustomEvent(CARD_SEND_EVENT));
}

/** 取出与当前面板会话匹配的待发消息；不匹配时保留，过期时清掉。 */
export function takeCardSend(notebookId: string, conversationId: string): string | null {
  if (!pending) return null;
  if (Date.now() - pending.at > PENDING_TTL_MS) { pending = null; return null; }
  if (pending.notebookId !== notebookId) return null;
  if (pending.conversationId && pending.conversationId !== conversationId) return null;
  const { text } = pending;
  pending = null;
  return text;
}

export function hasCardSend(): boolean {
  return pending !== null;
}
