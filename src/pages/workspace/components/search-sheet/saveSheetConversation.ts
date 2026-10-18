import { OPEN_AI_PANEL_EVENT } from "@/components/editor/ai/composer/selectionQuoteData";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import { createConversationId } from "@/stores/notebookAiChats/normalization";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { visibleSources, type SheetAnswer } from "./sheetAnswerState";

export type SearchAiTranscriptSource = { index: number | null; title: string };

/** 把一轮搜索问答落成 AI 面板的历史会话，不抢占当前激活会话。 */
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

/** 把搜索面板里完成的问答落成 AI 面板的一条历史会话，不抢占当前激活会话。 */
export function saveSheetConversation(notebookId: string, answer: SheetAnswer): string {
  return saveSearchAiTranscript(notebookId, answer.question, answer.text, visibleSources(answer).map(({ index, source }) => ({ index, title: source.title })));
}

/** 激活该会话后打开 AI 面板，面板会切到这条会话继续。 */
export function openSheetConversation(notebookId: string, conversationId: string) {
  useNotebookAiChats.getState().setActiveConversation(notebookId, conversationId);
  window.dispatchEvent(new CustomEvent(OPEN_AI_PANEL_EVENT));
}
