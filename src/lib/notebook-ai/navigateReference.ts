import type { NoteBlockLocation } from "./noteCitation";

export type PendingNoteReference = { pageId: string; location: NoteBlockLocation; expires: number };
let pending: PendingNoteReference | null = null;
const listeners = new Set<() => void>();

export function pendingNotebookAiReference(): PendingNoteReference | null {
  if (pending && pending.expires < Date.now()) pending = null;
  return pending;
}
export function consumeNotebookAiReference(request: PendingNoteReference): void {
  if (pending === request) pending = null;
}
export function subscribeNotebookAiReference(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function navigateNotebookAiReference(
  pageId: string | undefined | null,
  openPage: (pageId: string) => void,
  location?: NoteBlockLocation,
): boolean {
  const id = typeof pageId === "string" ? pageId.trim() : "";
  if (!id) return false;
  pending = location ? { pageId: id, location, expires: Date.now() + 10000 } : null;
  openPage(id);
  window.dispatchEvent(new CustomEvent("goose-note:close-ai-panel-if-fullscreen"));
  listeners.forEach(listener => listener());
  return true;
}
