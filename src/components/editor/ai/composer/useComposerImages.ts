/**
 * 输入框内联图片：注册表、hover 预览、插入/移除、卸载释放。
 * 被 AiComposerInput 在 Skill 预热 effect 之后调用。
 * 依赖 composerImageChip、imageDedup、composerTokens、skill 光标锚点。
 */
import { useCallback, useEffect, useState } from "react";
import type { PreviewContent } from "@/lib/preview/previewAction";
import type { AiImageAttachmentAttrs } from "./referenceLookup";
import { calculateImageSha256 } from "./imageDedup";
import { createImageChipElement, createImageId } from "./composerImageChip";
import { readTokensFromDom } from "./composerTokens";
import {
  ensureComposerCaretAnchors,
  placeCaretAfterNode,
  pruneEmptyComposerTextNodes,
} from "./useSkillCommands";

import type { ComposerImagesOptions } from "./composerImageTypes";
import { useComposerImagePreview } from "./useComposerImagePreview";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/composer/useComposerImages.ts#messages:1">`
zh-Hans:
  image: "图片"
  imageLimit_other: "每次最多添加 {{count}} 张图片。"
  oversizedImages: "有 {{count}} 张图片超过 {{limit}}MB，未添加。"
  duplicateImages: "有 {{count}} 张重复图片，未添加。"
  imagesAdded: "已添加 {{count}} 张图片。"
  duplicateRemoved: "检测到重复图片，已移除后加入的图片。"
en:
  image: "Image"
  imageLimit_one: "You can add up to {{count}} image at a time."
  imageLimit_other: "You can add up to {{count}} images at a time."
  oversizedImages: "Images skipped for exceeding {{limit}} MB: {{count}}."
  duplicateImages: "Duplicate images skipped: {{count}}."
  imagesAdded: "Images added: {{count}}."
  duplicateRemoved: "Duplicate images detected. The copies added later were removed."
`;
const t = createTranslator(messages);


export function useComposerImages(options: ComposerImagesOptions) {
  useLocale();
  const {
    editorRef,
    imageRegistryRef,
    imageDedupRef,
    imagePreviewElRef,
    imagePreviewHideTimerRef,
    activePreviewImageIdRef,
    activePreviewChipRef,
    onContentMutation,
    maxImageBytes,
    maxImageCount,
    onImageRejected,
  } = options;

  const [imagePreviewContent, setImagePreviewContent] =
    useState<PreviewContent | null>(null);

  const countImageTokens = useCallback((): number => {
    const el = editorRef.current;
    if (!el) return 0;
    return readTokensFromDom(el).filter((token) => token.type === "image")
      .length;
  }, [editorRef]);

  const {
    hideImagePreview,
    cancelImagePreviewHide,
    handleImagePreviewOver,
    handleImagePreviewOut,
  } = useComposerImagePreview(options);

  const releaseAllImages = useCallback(() => {
    hideImagePreview();
    imageRegistryRef.current.forEach((entry) =>
      URL.revokeObjectURL(entry.previewUrl),
    );
    imageRegistryRef.current.clear();
    imageDedupRef.current.clear();
  }, [hideImagePreview, imageDedupRef, imageRegistryRef]);

  const removeImageChip = useCallback(
    (imageId: string) => {
      if (activePreviewImageIdRef.current === imageId) {
        hideImagePreview();
      }
      const el = editorRef.current;
      const chip = el
        ?.querySelector<HTMLElement>(`[data-ai-image-remove="${imageId}"]`)
        ?.closest("[data-ai-image-attrs]");
      const entry = imageRegistryRef.current.get(imageId);
      if (entry) {
        URL.revokeObjectURL(entry.previewUrl);
        imageRegistryRef.current.delete(imageId);
      }
      imageDedupRef.current.release(imageId);
      if (chip?.parentNode) {
        chip.parentNode.removeChild(chip);
        onContentMutation();
      }
    },
    [
      activePreviewImageIdRef,
      editorRef,
      hideImagePreview,
      imageDedupRef,
      imageRegistryRef,
      onContentMutation,
    ],
  );

  const insertImages = useCallback(
    (files: File[]) => {
      const el = editorRef.current;
      if (!el || files.length === 0) return;

      const currentCount = countImageTokens();
      const capacity =
        maxImageCount !== undefined
          ? Math.max(0, maxImageCount - currentCount)
          : files.length;

      if (capacity <= 0 && maxImageCount !== undefined) {
        onImageRejected?.(t("imageLimit", { count: maxImageCount }));
        return;
      }

      const accepted: { file: File; attrs: AiImageAttachmentAttrs }[] = [];
      let oversized = 0;
      let duplicates = 0;
      for (const file of files) {
        if (accepted.length >= capacity) break;
        if (maxImageBytes !== undefined && file.size > maxImageBytes) {
          oversized += 1;
          continue;
        }

        const attrs: AiImageAttachmentAttrs = {
          imageId: createImageId(),
          fileName: file.name || t("image"),
          mediaType: file.type || "image/*",
          size: file.size,
        };
        if (!imageDedupRef.current.claim(attrs.imageId, file)) {
          duplicates += 1;
          continue;
        }
        accepted.push({ file, attrs });
      }

      if (oversized > 0) {
        onImageRejected?.(
          t("oversizedImages", { count: oversized, limit: Math.round(maxImageBytes! / 1024 / 1024) }),
        );
      }
      if (duplicates > 0) {
        onImageRejected?.(t("duplicateImages", { count: duplicates }));
      }
      if (accepted.length === 0) return;
      if (accepted.length < files.length - oversized - duplicates) {
        onImageRejected?.(t("imagesAdded", { count: accepted.length }));
      }

      // 确保 selection 落在编辑器内（否则追加到末尾）
      const selection = window.getSelection();
      const inside =
        selection &&
        selection.rangeCount > 0 &&
        (el === selection.anchorNode || el.contains(selection.anchorNode));
      if (!inside) {
        el.focus({ preventScroll: true });
        const endRange = document.createRange();
        endRange.selectNodeContents(el);
        endRange.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(endRange);
      }

      const range = window.getSelection()!.getRangeAt(0);
      range.deleteContents();

      // Spacing via CSS margin on .ai-composer-chip; no spacer text nodes.
      const frag = document.createDocumentFragment();
      let lastChip: HTMLSpanElement | null = null;
      for (const { file, attrs } of accepted) {
        imageRegistryRef.current.set(attrs.imageId, {
          file,
          previewUrl: URL.createObjectURL(file),
        });
        lastChip = createImageChipElement(attrs, imageRegistryRef.current);
        frag.appendChild(lastChip);
      }
      range.insertNode(frag);
      pruneEmptyComposerTextNodes(el);
      ensureComposerCaretAnchors(el);

      if (lastChip) {
        // 落在 ZWSP/文本节点上，旧 Chromium 才能画出 caret
        placeCaretAfterNode(lastChip);
      }

      onContentMutation();

      for (const { file, attrs } of accepted) {
        void calculateImageSha256(file).then((contentHash) => {
          if (!contentHash || !imageDedupRef.current.has(attrs.imageId)) return;
          const duplicateId = imageDedupRef.current.resolveContentHash(
            attrs.imageId,
            contentHash,
          );
          if (!duplicateId) return;
          removeImageChip(duplicateId);
          onImageRejected?.(t("duplicateRemoved"));
        });
      }
    },
    [
      countImageTokens,
      editorRef,
      imageDedupRef,
      imageRegistryRef,
      maxImageBytes,
      maxImageCount,
      onContentMutation,
      onImageRejected,
      removeImageChip,
    ],
  );

  useEffect(() => {
    const registry = imageRegistryRef.current;
    const dedup = imageDedupRef.current;
    return () => {
      if (imagePreviewHideTimerRef.current != null) {
        clearTimeout(imagePreviewHideTimerRef.current);
        imagePreviewHideTimerRef.current = null;
      }
      const preview = imagePreviewElRef.current;
      if (preview?.isConnected) {
        preview.remove();
      }
      imagePreviewElRef.current = null;
      activePreviewImageIdRef.current = null;
      activePreviewChipRef.current = null;
      registry.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      registry.clear();
      dedup.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    imagePreviewContent,
    setImagePreviewContent,
    hideImagePreview,
    cancelImagePreviewHide,
    releaseAllImages,
    removeImageChip,
    insertImages,
    handleImagePreviewOver,
    handleImagePreviewOut,
  };
}
