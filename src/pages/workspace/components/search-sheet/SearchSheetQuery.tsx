import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, type DragEvent, type MutableRefObject } from "react";
import { toast } from "@/components/ui/sonner";
import { AiComposerInput, type AiComposerInputHandle } from "@/components/editor/ai/composer/AiComposerInput";
import { getAiReferenceSuggestionItems } from "@/components/editor/ai/composer/referenceSuggestions";
import { extractClipboardImageFiles } from "@/components/editor/utils/pasteClipboardImage";
import { GOOSE_FOLDER_MIME, hasWorkspaceDrag } from "@/lib/workspace-drag";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { collapseComposerSearchText, composerDocFromPlainText } from "./searchQueryText";

const MAX_IMAGE_ATTACHMENTS = 4;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;

export type SearchSheetQueryHandle = {
  focus: (selectAll?: boolean) => void;
  clear: () => void;
  containsTarget: (target: EventTarget | null) => boolean;
  getQuestion: () => string;
};

type SearchSheetQueryProps = {
  seed: string;
  placeholder: string;
  label: string;
  notebookId: string | null;
  scopeAll: boolean;
  listId: string;
  expanded: boolean;
  activeDescendant?: string;
  composingRef: MutableRefObject<boolean>;
  onSearchText: (text: string) => void;
  onPrompt: (prompt: string) => void;
  onSubmit: () => void;
  onEscape: () => void;
  onEmptyChange: (empty: boolean) => void;
};

export const SearchSheetQuery = forwardRef<SearchSheetQueryHandle, SearchSheetQueryProps>(function SearchSheetQuery({
  seed, placeholder, label, notebookId, scopeAll, listId, expanded, activeDescendant, composingRef,
  onSearchText, onPrompt, onSubmit, onEscape, onEmptyChange,
}, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<AiComposerInputHandle>(null);
  const [initialContent] = useState(() => composerDocFromPlainText(seed));
  const [dropActive, setDropActive] = useState(false);
  const publish = useCallback(() => {
    const payload = inputRef.current?.getPayload();
    onSearchText(collapseComposerSearchText(payload?.freeformText ?? ""));
    onPrompt(payload?.promptText.trim() ?? "");
  }, [onPrompt, onSearchText]);
  const searchPages = useCallback((query: string) => {
    const pages = usePages.getState().pages;
    const notebooks = useNotebooks.getState().notebooks;
    const scopedId = scopeAll ? null : notebookId;
    return getAiReferenceSuggestionItems(query, pages, notebooks, scopedId, {
      notebookId: scopedId,
      includeFolders: scopedId ? notebooks[scopedId]?.source === "local-folder" : true,
    });
  }, [notebookId, scopeAll]);

  useImperativeHandle(ref, () => ({
    focus: (selectAll) => {
      const el = inputRef.current?.getEditorEl();
      if (!el) return;
      el.focus({ preventScroll: true });
      if (!selectAll) {
        inputRef.current?.focus();
        return;
      }
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    },
    clear: () => inputRef.current?.clear(),
    containsTarget: (target) => target instanceof Node && Boolean(rootRef.current?.contains(target)),
    getQuestion: () => inputRef.current?.getPayload().promptText.trim() ?? "",
  }), []);

  useLayoutEffect(() => {
    const el = inputRef.current?.getEditorEl();
    if (!el) return;
    el.setAttribute("role", "combobox");
    el.setAttribute("aria-label", label);
    el.setAttribute("aria-controls", listId);
    el.setAttribute("aria-expanded", expanded ? "true" : "false");
    el.setAttribute("aria-autocomplete", "list");
    if (activeDescendant) el.setAttribute("aria-activedescendant", activeDescendant);
    else el.removeAttribute("aria-activedescendant");
  }, [activeDescendant, expanded, label, listId]);

  const insertDroppedImages = (data: DataTransfer | null) => {
    const files = extractClipboardImageFiles(data);
    if (!files.length) return;
    inputRef.current?.insertImages(files);
    inputRef.current?.focus();
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    if (types.includes(GOOSE_FOLDER_MIME) || hasWorkspaceDrag(event.dataTransfer)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      setDropActive(false);
      return;
    }
    if (!types.includes("Files") && !types.some((type) => type.startsWith("image/"))) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    setDropActive(false);
    if (hasWorkspaceDrag(event.dataTransfer) || Array.from(event.dataTransfer.types).includes(GOOSE_FOLDER_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      return;
    }
    const files = extractClipboardImageFiles(event.dataTransfer);
    if (!files.length) return;
    event.preventDefault();
    insertDroppedImages(event.dataTransfer);
  };

  return <div ref={rootRef} className="search-sheet-composer" data-drop-active={dropActive ? "true" : undefined}
    onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={(event) => {
      const related = event.relatedTarget;
      if (related instanceof Node && event.currentTarget.contains(related)) return;
      setDropActive(false);
    }} onDrop={onDrop}
    onCompositionStart={() => { composingRef.current = true; }} onCompositionEnd={() => { composingRef.current = false; }}>
    <AiComposerInput ref={inputRef} placeholder={placeholder} autoFocusToken={0} initialContent={initialContent}
      onContentChange={publish} onSubmit={onSubmit} onEscape={onEscape} onIsEmptyChange={onEmptyChange}
      className="search-sheet-composer-input" searchPages={searchPages} referencePlacement="inline" variant="panel"
      notebookId={notebookId ?? undefined} maxImageBytes={MAX_IMAGE_FILE_BYTES} maxImageCount={MAX_IMAGE_ATTACHMENTS}
      onImageRejected={(message) => toast.error(message)}/>
  </div>;
});
