export const CARD_SEND_EVENT = "goose-note:card-send";

export type PendingCardSend = { notebookId: string; conversationId?: string; text: string };

const PENDING_TTL_MS = 15_000;
let pending: (PendingCardSend & { at: number }) | null = null;

export function queueCardSend(request: PendingCardSend): void {
  pending = { ...request, at: Date.now() };
  window.dispatchEvent(new CustomEvent(CARD_SEND_EVENT));
}

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
