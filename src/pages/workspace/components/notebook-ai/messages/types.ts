import type { RefObject } from "react";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { EditorRef } from "@/components/editor/core/Editor";
import type {
  BatchApprovalResponse,
  BatchUndoResult,
} from "../ApprovalPlanCard";
export interface ChatMessagesProps {
  messages: NotebookAiMessage[];
  streamingMessageId?: string;
  editorRef?: RefObject<EditorRef | null>;
  layout?: "side-panel" | "fullscreen";
  onEmptySuggestion?: (text: string) => void;
  onBatchApproval: (response: BatchApprovalResponse) => Promise<void> | void;
  onBatchUndo: (toolCallId: string, runId: string) => Promise<BatchUndoResult>;
}
