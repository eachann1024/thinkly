import { useCallback, useState } from "react";
import { parseSelectionQuoteAttrs, type AiSelectionQuoteAttrs } from "./selectionQuoteData";
import { cleanupOrphanComposerZwspNodes, placeCaretInEditor } from "./composerChipDom";
import { extractClipboardImageFiles } from "@/components/editor/utils/pasteClipboardImage";
import {
  getPreviewableImageChip,
  parseImageChipAttrs,
} from "./composerImageChip";
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
  const [quotePreview, setQuotePreview] = useState<AiSelectionQuoteAttrs | null>(null);
  const {
    hideImagePreview,
    removeImageChip,
    setImagePreviewContent,
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
          setQuotePreview(parseSelectionQuoteAttrs(quoteChip.dataset.aiSelectionQuoteAttrs));
        }
        return;
      }
      const removeBtn = target.closest<HTMLElement>("[data-ai-image-remove]");
      if (removeBtn) {
        event.preventDefault();
        // 移除前先关预览，避免悬空浮层
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
          // 悬停浮层与全屏同时在场会互相遮挡
          hideImagePreview();
          setImagePreviewContent({
            kind: "image",
            data: entry.file,
            fileName: attrs.fileName,
          });
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
    [disabled, editorRef, emitCurrentContent, hideImagePreview, onOpenPage, removeImageChip, setImagePreviewContent],
  );

  const handleBlurNative = useCallback(() => {
    endImeSession();
    handleMentionBlur();
    clearCommandState();
    // 失焦时关掉图片预览，避免浮层悬空
    hideImagePreview();
  }, [endImeSession, handleMentionBlur, clearCommandState, hideImagePreview]);

  /**
   * 焦点在 contenteditable 内时粘贴：命令式节点不走 React 冒泡时 dock onPaste 可能丢。
   * Mac 截图常只有 clipboardData.items，此处与 dock 共用 extractClipboardImageFiles。
   */
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

  return { handleClickNative, handleBlurNative, handlePasteNative, quotePreview, setQuotePreview };
}
