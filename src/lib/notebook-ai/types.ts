import type { UIMessage, InferUITools } from "ai";
import type {
  AiFileReferenceAttrs,
  AiSkillCommandAttrs,
} from "@/components/editor/ai/composer/referenceLookup";
import type { AiSelectionQuoteAttrs } from "@/components/editor/ai/composer/selectionQuote";
import type { NotebookAiTools } from "./tools";
import type { NotebookSkillId } from "./skills";
import type { ResourceRef, RunWriteScope } from "./resourceScope";

export type NotebookAiContextMode = "structure-summary" | "full-text";

export type NotebookAiContextBudgetTier =
  | "summary-standard"
  | "full-text-standard";

export interface NotebookAiContextDiagnostics {
  uniqueReferenceCount: number;
  occurrenceCount: number;
  summaryCount: number;
  fullTextCount: number;
  failedCount: number;
  contextCharacters: number;
  budgetTier: NotebookAiContextBudgetTier;
  characterBudget: number;
  imageCount?: number;
}

export interface NotebookAiMessageMetadata {
  displayText?: string;
  resourceReferences?: ResourceRef[];
  writeScope?: RunWriteScope;
  currentPageId?: string | null;
  references?: AiFileReferenceAttrs[];
  skills?: AiSkillCommandAttrs[];
  selectionQuotes?: AiSelectionQuoteAttrs[];
  implicitPage?: AiFileReferenceAttrs;
  diagnostics?: NotebookAiContextDiagnostics;
  imageAttachments?: Array<{
    filename: string;
    mediaType: string;
  }>;
  createdAt?: number;
  compacted?: boolean;
}

export type NotebookAiMessage = UIMessage<
  NotebookAiMessageMetadata,
  never,
  InferUITools<NotebookAiTools>
>;

export interface NotebookAiAgentContext {
  notebookId: string;
  notebookIds?: string[];
  currentPageId?: string | null;
  loadedSkills: Set<NotebookSkillId>;
  resourceReferences?: ResourceRef[];
  writeScope?: RunWriteScope;
}

export interface NotebookAiConversationState {
  id: string;
  messages: NotebookAiMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface NotebookAiChatState {
  activeConversationId: string | null;
  conversations: Record<string, NotebookAiConversationState>;
  updatedAt: number;
}

export interface NotebookAiChatsPersistedState {
  chats: Record<string, NotebookAiChatState>;
}

export interface LiveWriterContext {
  notebookId: string;
  currentPageId?: string | null;
}
