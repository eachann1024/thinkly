import { OPEN_AI_PANEL_EVENT } from "@/components/editor/ai/composer/selectionQuoteData";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { createConversationId } from "@/stores/notebookAiChats/normalization";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { visibleSources, type SheetAnswer } from "./sheetAnswerState";

export type SearchAiTranscriptSource = { index: number | null; title: string };

export function saveSearchAiTranscript(notebookId: string, question: string, text: string, sources: SearchAiTranscriptSource[]): string {
  const id = createConversationId();
  const createdAt = Date.now();
  const cited = sources.map(({ index, title }) => index ? `[${index}] ${title}` : `- ${title}`).join("\n");
  const messages: NotebookAiMessage[] = [
    { id: `${id}-user`, role: "user", parts: [{ type: "text", text: question }], metadata: { createdAt } },
    { id: `${id}-assistant`, role: "assistant", parts: [{ type: "text", text: cited ? `${text}\n\n${cited}` : text }], metadata: { createdAt } },
  ];
  useNotebookAiChats.getState().setMessages(notebookId, id, messages);
  return id;
}

export function saveSheetConversation(notebookId: string, answer: SheetAnswer): string {
  return saveSearchAiTranscript(notebookId, answer.question, answer.text, visibleSources(answer).map(({ index, source }) => ({ index, title: source.title })));
}

export function openSheetConversation(notebookId: string, conversationId: string) {
  useNotebookAiChats.getState().setActiveConversation(notebookId, conversationId);
  window.dispatchEvent(new CustomEvent(OPEN_AI_PANEL_EVENT));
}
