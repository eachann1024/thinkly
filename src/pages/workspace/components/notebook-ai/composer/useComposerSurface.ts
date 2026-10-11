import type { JSONContent } from "@/types";
import { useRef, useState } from "react";
import type { AiComposerInputHandle } from "@/components/editor/ai/composer/AiComposerInput";
import { composerDraftHasContent, useNotebookAiChats } from "@/stores/useNotebookAiChats";
import type { ComposerProps } from "./types";

/** The panel always uses a stable multiline surface; editing never rearranges its toolbar. */
export function useComposerSurface({ notebookId, initialContent, disabled }: ComposerProps) {
  const inputRef = useRef<AiComposerInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoFocusToken, setAutoFocusToken] = useState(disabled ? 0 : 1);
  // Hydrate once; feeding each saved draft back into contenteditable would reset its selection.
  const [seedContent] = useState<JSONContent | null>(() =>
    initialContent !== undefined ? initialContent : useNotebookAiChats.getState().getComposerDraft(notebookId),
  );
  const [isEmpty, setIsEmpty] = useState(() => !composerDraftHasContent(seedContent));
  return { inputRef, fileInputRef, autoFocusToken, setAutoFocusToken, seedContent, isEmpty, setIsEmpty };
}
export type ComposerSurfaceState = ReturnType<typeof useComposerSurface>;
