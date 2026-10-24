import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { AiComposerPayload } from "@/components/editor/ai/composer/referenceLookup";
import type { NotebookAiPanelSelectionCapture } from "../useNotebookAiPanel";
import type { NotebookAiImageAttachment } from "../Composer";
import type {
  BatchApprovalResponse,
  BatchUndoResult,
} from "../ApprovalPlanCard";
import type { getNotebookAiReferenceSuggestions } from "@/lib/notebook-ai/context";
export interface NotebookAiSessionValue {
  notebookId: string;
  conversationId: string;
  messages: NotebookAiMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
  clearError: () => void;
  stop: () => void;
  isStreaming: boolean;
  isBusy: boolean;
  unavailableReason: string | undefined;
  placeholderIndex: number;
  composerRevision: number;
  send: (
    payload: AiComposerPayload,
    imageAttachments: NotebookAiImageAttachment[],
    options?: {
      capturedSelection?: NotebookAiPanelSelectionCapture | null;
      onConsumeCapturedSelection?: () => void;
    },
  ) => Promise<boolean>;
  newConversation: (options?: {
    onConsumeCapturedSelection?: () => void;
  }) => void;
  ensureFreshConversation: () => string;
  compactConversation: () => void;
  selectConversation: (
    nextConversationId: string,
    options?: { onConsumeCapturedSelection?: () => void },
  ) => void;
  deleteConversation: (targetConversationId: string) => boolean;
  searchPages: (
    query: string,
  ) => ReturnType<typeof getNotebookAiReferenceSuggestions>;
  onBatchApproval: (response: BatchApprovalResponse) => Promise<void>;
  onBatchUndo: (toolCallId: string, runId: string) => Promise<BatchUndoResult>;
}

export interface NotebookAiSessionScope {
  notebookId: string;
  conversationId: string;
  generation: number;
}
