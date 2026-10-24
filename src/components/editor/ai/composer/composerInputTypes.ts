import type { JSONContent } from "@/types";
import type {
 AiComposerPayload,
 AiFileReferenceAttrs,
 AiReferenceSuggestionItem,
} from "./referenceLookup";
import type { AiSelectionQuoteAttrs } from "./selectionQuote";
import type { ComposerSlashBuiltinId } from "@/lib/notebook-ai/composerSlashCommands";

export interface AiComposerInputHandle {
 focus: () => void;
 getEditorEl: () => HTMLDivElement | null;
 clear: () => void;
 getPayload: () => AiComposerPayload;
 resolveImages: (
  payload: AiComposerPayload,
 ) => { file: File; previewUrl: string }[];
 insertImages: (files: File[]) => void;
 insertReference: (reference: AiFileReferenceAttrs) => void;
 appendSelectionQuote: (
  quote: AiSelectionQuoteAttrs,
  options?: { restoreCaret?: boolean; animate?: boolean },
 ) => "appended" | "duplicate" | "skipped";
}

export interface AiComposerInputProps {
 placeholder: string;
 placeholderOverlayText?: string;
 autoFocusToken: number;
 onSubmit: () => void;
 onEscape: () => void;
 initialContent?: JSONContent | null;
 onContentChange?: (content: JSONContent | null) => void;
 onIsEmptyChange?: (isEmpty: boolean) => void;
 className?: string;
 onReferenceAdded?: (reference: AiFileReferenceAttrs) => void;
 searchPages?: (query: string) => AiReferenceSuggestionItem[];
 referencePlacement?: "inline" | "external";
 variant?: "compact" | "panel";
 compactWidthClass?: string;
 disabled?: boolean;
 maxImageBytes?: number;
 maxImageCount?: number;
 onImageRejected?: (message: string) => void;
 notebookId?: string;
 onSlashCommand?: (id: ComposerSlashBuiltinId) => void;
 onSuggestionsChange?: (kind: "mention" | "command" | null) => void;
}

export interface ComposerNativeHandlers {
 onBeforeInput: (event: Event) => void;
 onInput: (event: Event) => void;
 onKeyDown: (event: KeyboardEvent) => void;
 onClick: (event: MouseEvent) => void;
 onMouseOver: (event: MouseEvent) => void;
 onMouseOut: (event: MouseEvent) => void;
 onPaste: (event: ClipboardEvent) => void;
 onBlur: () => void;
 onCompositionStart: () => void;
 onCompositionEnd: () => void;
}
