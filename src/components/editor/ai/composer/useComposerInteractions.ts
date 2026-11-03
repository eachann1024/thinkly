import { useCallback } from "react";
import { openSelectionQuote } from "@/windows/open/openSelectionQuote";
import { parseSelectionQuoteAttrs } from "./selectionQuoteData";
import { cleanupOrphanComposerZwspNodes, placeCaretInEditor } from "./composerChipDom";
import { extractClipboardImageFiles } from "@/components/editor/utils/pasteClipboardImage";
import {
  getPreviewableImageChip,
  parseImageChipAttrs,
} from "./composerImageChip";
import { openFullscreenPreview } from "@/lib/preview/fullscreenPreviewWindow";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { usePages } from "@/stores/usePages";
import type { AiComposerInputProps } from "./composerInputTypes";
import type { ComposerContentState } from "./useComposerContentState";
import type { useComposerImages } from "./useComposerImages";

export function useComposerInteractions(
  props: AiComposerInputProps,
  state: ComposerContentState,
  images: ReturnType<typeof useComposerImages>,
  onOpenPage: (pageId: string) => void,
  endImeSession: () => void,
  handleMentionBlur: () => void,
  clearCommandState: () => void,
) {
  const { disabled } = props;
  const { imageRegistryRef, editorRef, emitCurrentContent } = state;
  const {
    hideImagePreview,
    removeImageChip,
    insertImages,
  } = images;
  const handleClickNative = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const quoteChip = target.closest<HTMLElement>("[data-ai-selection-quote-attrs]");
      if (quoteChip) {
        event.preventDefault();
        if (target.closest("[data-ai-quote-remove]")) {
          if (disabled) return;
          quoteChip.remove();
          const editor = editorRef.current;
          if (editor) {
            cleanupOrphanComposerZwspNodes(editor);
            editor.focus();
            placeCaretInEditor(editor, false);
          }
          emitCurrentContent();
        } else {
          openSelectionQuote(parseSelectionQuoteAttrs(quoteChip.dataset.aiSelectionQuoteAttrs));
        }
        return;
      }
      const removeBtn = target.closest<HTMLElement>("[data-ai-image-remove]");
      if (removeBtn) {
        event.preventDefault();
        hideImagePreview();
        removeImageChip(removeBtn.dataset.aiImageRemove!);
        return;
      }
      const imageChip = getPreviewableImageChip(target);
      if (imageChip?.dataset.aiImagePreviewable === "true") {
        event.preventDefault();
        const attrs = parseImageChipAttrs(imageChip);
        const entry = attrs
          ? imageRegistryRef.current.get(attrs.imageId)
          : null;
        if (attrs && entry) {
          hideImagePreview();
          const pageId = usePages.getState().activePageId;
          const page = pageId ? usePages.getState().pages[pageId] : undefined;
          void openFullscreenPreview(
            { kind: "image", data: entry.file, fileName: attrs.fileName },
            attrs.fileName,
            page ? getPageTitle(page) : undefined,
          );
        }
        return;
      }
      const mentionChip = target.closest<HTMLElement>("[data-ai-mention-id]");
      const mentionId = mentionChip?.dataset.aiMentionId;
      if (mentionId) {
        event.preventDefault();
        onOpenPage(mentionId);
      }
    },
    [disabled, editorRef, emitCurrentContent, hideImagePreview, onOpenPage, removeImageChip],
  );

  const handleBlurNative = useCallback(() => {
    endImeSession();
    handleMentionBlur();
    clearCommandState();
    hideImagePreview();
  }, [endImeSession, handleMentionBlur, clearCommandState, hideImagePreview]);

  const handlePasteNative = useCallback(
    (event: ClipboardEvent) => {
      if (disabled) return;
      const imageFiles = extractClipboardImageFiles(event.clipboardData);
      if (imageFiles.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      insertImages(imageFiles);
    },
    [disabled, insertImages],
  );

  return { handleClickNative, handleBlurNative, handlePasteNative };
}
