import { useCallback, useEffect, useRef, useState } from "react";
import {
  getImageElements,
  getImageBlockElement,
  getBlockIdFromImage,
  getImageSrc,
  getImageBlockIdByIndex,
  getImageAlignmentFromBlock,
  type ImageAlignment,
} from "./imageUtils";
import type { SelectedImageState } from "./ImageToolbar";
import type { ImageLightboxProps } from "./lightboxTypes";
import type { useLightboxActions } from "./useLightboxActions";
import { subscribeBlockHover, useBlockToolbarState } from "../core/blockToolbarSequence";
import { ownsBlockToolbar } from "../core/blockToolbarOwner";
import { observeAnchorRect, sameAnchorRect } from "./observeAnchorRect";

export function useSelectedImage(
  editor: ImageLightboxProps["editor"],
  editorContainerRef: ImageLightboxProps["editorContainerRef"],
  openLightboxAtImage: (img: HTMLImageElement) => Promise<void>,
  actions: ReturnType<typeof useLightboxActions>,
) {
  const { openImageInSystemViewer, downloadImage, copyImageToClipboard } =
    actions;
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(
    null,
  );
  const selectedImageRef = useRef<SelectedImageState | null>(null);
  const selectedElements = useRef<{ image: HTMLImageElement; anchor: HTMLElement } | null>(null);
  const toolbarState = useBlockToolbarState(editor, selectedImage?.blockId ?? undefined);
  useEffect(() => {
    selectedImageRef.current = selectedImage;
  }, [selectedImage]);
  const updateSelectedImageFromElement = useCallback(
    (img: HTMLImageElement) => {
      const container = editorContainerRef.current;
      if (!container) return;

      const imageIndex = getImageElements(container).indexOf(img);
      const blockId =
        getBlockIdFromImage(img, container) ||
        getImageBlockIdByIndex(editor.document as any[], imageIndex);
      const block = blockId ? editor.getBlock(blockId) : null;
      const blockElement = getImageBlockElement(img, container);
      const anchorElement = __GOOSE_EDITOR_COMPACT__
        ? (blockElement ?? img)
        : img;

      selectedElements.current = { image: img, anchor: anchorElement };
      const next: SelectedImageState = {
        blockId,
        src:
          (block?.props as { url?: string } | undefined)?.url ||
          getImageSrc(img),
        alt: img.alt || img.getAttribute("alt") || "",
        index: imageIndex,
        rect: anchorElement.getBoundingClientRect(),
        alignment: getImageAlignmentFromBlock(block),
      };
      selectedImageRef.current = next;
      setSelectedImage(next);
    },
    [editor, editorContainerRef],
  );

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const img = target?.closest<HTMLImageElement>(
        '.bn-block-content[data-content-type="image"] img, .bn-block-content[data-content-type="imageResize"] img',
      );

      if (!img || !container.contains(img)) {
        if (!ownsBlockToolbar(
          target?.closest<HTMLElement>("[data-goose-image-toolbar]") ?? null,
          editor.prosemirrorView.dom,
          selectedImageRef.current?.blockId,
        )) {
          setSelectedImage(null);
        }
        return;
      }

      updateSelectedImageFromElement(img);
    };

    const stopHover = subscribeBlockHover(editor.prosemirrorView.dom, (detail) => {
      const image = detail.phase === "toolbar"
        ? getImageElements(container).find(
            (img) => getBlockIdFromImage(img, container) === detail.blockId,
          )
        : undefined;
      if (image) updateSelectedImageFromElement(image);
      else setSelectedImage(null);
    });

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      stopHover();
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [editor, editorContainerRef, updateSelectedImageFromElement]);

  useEffect(() => {
    if (!selectedImage) return;
    return observeAnchorRect(() => {
      const cached = selectedElements.current;
      if (cached?.image.isConnected && cached.anchor.isConnected) return cached.anchor;
      const container = editorContainerRef.current;
      const current = selectedImageRef.current;
      if (!container || !current) return null;
      const images = getImageElements(container);
      const image = current.blockId
        ? images.find(img => getBlockIdFromImage(img, container) === current.blockId)
        : images[current.index];
      if (!image) { setSelectedImage(null); return null; }
      updateSelectedImageFromElement(image);
      return selectedElements.current?.anchor ?? null;
    }, (rect) => {
      const current = selectedImageRef.current;
      if (!current || sameAnchorRect(current.rect, rect)) return;
      const next = { ...current, rect };
      selectedImageRef.current = next;
      setSelectedImage(next);
    });
  }, [selectedImage?.blockId, selectedImage?.index, editorContainerRef, updateSelectedImageFromElement]);
  const applyImageAlignment = useCallback(
    (alignment: ImageAlignment) => {
      if (!selectedImage?.blockId) return;
      const block = editor.getBlock(selectedImage.blockId);
      if (!block) return;

      editor.updateBlock(block, {
        props: { textAlignment: alignment },
      } as any);

      setSelectedImage((current) =>
        current ? { ...current, alignment } : current,
      );
    },
    [editor, selectedImage],
  );

  const handleSelectedImageZoom = useCallback(async () => {
    const container = editorContainerRef.current;
    if (!container || !selectedImage) return;
    const img = getImageElements(container)[selectedImage.index];
    if (!img) return;
    await openLightboxAtImage(img);
  }, [editorContainerRef, openLightboxAtImage, selectedImage]);

  const handleSelectedImageSystemPreview = useCallback(async () => {
    const container = editorContainerRef.current;
    if (!container || !selectedImage) return;
    const img = getImageElements(container)[selectedImage.index];
    if (!img) return;
    await openImageInSystemViewer(img);
  }, [editorContainerRef, openImageInSystemViewer, selectedImage]);

  const getSelectedImageRect = useCallback(() => {
    const container = editorContainerRef.current;
    const current = selectedImageRef.current;
    if (!container || !current) return null;
    return (
      getImageElements(container)[current.index]?.getBoundingClientRect() ??
      null
    );
  }, [editorContainerRef]);

  const handleSelectedImageDownload = useCallback(async () => {
    if (!selectedImage) return;
    await downloadImage(selectedImage.src);
  }, [downloadImage, selectedImage]);

  const handleSelectedImageCopy = useCallback(async () => {
    if (!selectedImage) return;
    await copyImageToClipboard(selectedImage.src);
  }, [copyImageToClipboard, selectedImage]);

  return {
    selectedImage: toolbarState.ready && !toolbarState.suppressed ? selectedImage : null,
    applyImageAlignment,
    handleSelectedImageZoom,
    handleSelectedImageSystemPreview,
    getSelectedImageRect,
    handleSelectedImageDownload,
    handleSelectedImageCopy,
  };
}
