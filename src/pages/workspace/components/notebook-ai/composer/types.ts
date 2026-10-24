import type {
  AiComposerPayload,
  AiFileReferenceAttrs,
  AiReferenceSuggestionItem,
} from "@/components/editor/ai/composer/referenceLookup";
import type { AiSelectionQuoteAttrs } from "@/components/editor/ai/composer/selectionQuote";
import type { JSONContent } from "@/types";
import type { ComposerSlashBuiltinId } from "@/lib/notebook-ai/composerSlashCommands";
export interface NotebookAiImageAttachment {
  file: File;
  previewUrl: string;
}

export interface ComposerHandle {
  focus: () => void;
  insertReference: (reference: AiFileReferenceAttrs) => void;
  appendSelectionQuote: (
    quote: AiSelectionQuoteAttrs,
    options?: { restoreCaret?: boolean; animate?: boolean },
  ) => "appended" | "duplicate" | "skipped";
}

export interface ComposerProps {
  notebookId: string;
  conversationId?: string;
  initialContent?: JSONContent | null;
  onSend: (
    payload: AiComposerPayload,
    images: NotebookAiImageAttachment[],
  ) => boolean | void | Promise<boolean | void>;
  onSlashCommand?: (id: ComposerSlashBuiltinId) => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPages?: (query: string) => AiReferenceSuggestionItem[];
  onEscape?: () => void;
  layout?: "side-panel" | "fullscreen";
}
