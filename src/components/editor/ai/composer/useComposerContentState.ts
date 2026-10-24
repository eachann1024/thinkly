import { useCallback, useRef, useState } from "react";
import type { JSONContent } from "@/types";
import { composerDraftHasContent } from "@/stores/useNotebookAiChats";
import { ImageDedupTracker } from "./imageDedup";
import {
  clearComposerImageRegistry,
  gcStaleComposerImages,
  type ComposerImageRegistry,
} from "./composerImageChip";
import {
  buildJsonContentFromTokens,
  buildPayloadFromTokens,
  isComposerPayloadEmpty,
  readTokensFromDom,
} from "./composerTokens";
import { isEditorDomEmpty } from "./composerChipDom";
import type {
  AiComposerInputProps,
  ComposerNativeHandlers,
} from "./composerInputTypes";

export function useComposerContentState(props: AiComposerInputProps) {
  const { initialContent, onContentChange, onIsEmptyChange } = props;
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const liveRegionRef = useRef<HTMLSpanElement | null>(null);
  const nativeHandlersRef = useRef<ComposerNativeHandlers | null>(null);
  const isComposingRef = useRef(false);
  const isEmptyRef = useRef(!composerDraftHasContent(initialContent));
  const lastEmittedContentRef = useRef<JSONContent | null | undefined>(
    initialContent,
  );
  const lastReceivedContentRef = useRef(initialContent);
  const imageRegistryRef = useRef<ComposerImageRegistry>(new Map());
  const imageDedupRef = useRef(new ImageDedupTracker());
  const imagePreviewElRef = useRef<HTMLDivElement | null>(null);
  const imagePreviewHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activePreviewImageIdRef = useRef<string | null>(null);
  const activePreviewChipRef = useRef<HTMLElement | null>(null);

  const [isEmpty, setIsEmpty] = useState(() => isEmptyRef.current);

  const setPlaceholderVisible = useCallback((visible: boolean) => {
    const node = placeholderRef.current;
    if (!node) return;
    const display = visible ? "" : "none";
    if (node.style.display !== display) node.style.display = display;
  }, []);

  const syncEmptyState = useCallback(
    (empty: boolean) => {
      setPlaceholderVisible(empty);
      if (isEmptyRef.current === empty) return;
      isEmptyRef.current = empty;
      setIsEmpty(empty);
      onIsEmptyChange?.(empty);
    },
    [onIsEmptyChange, setPlaceholderVisible],
  );

  const gcStaleImages = useCallback((liveIds: Set<string>) => {
    gcStaleComposerImages({
      liveIds,
      registry: imageRegistryRef.current,
      dedup: imageDedupRef.current,
      imagePreviewHideTimerRef,
      activePreviewImageIdRef,
      activePreviewChipRef,
      imagePreviewElRef,
    });
  }, []);

  const emitCurrentContent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    if (isEditorDomEmpty(el)) {
      syncEmptyState(true);
      if (lastEmittedContentRef.current != null) {
        lastEmittedContentRef.current = null;
        onContentChange?.(null);
      }
      const registry = imageRegistryRef.current;
      if (registry.size > 0) {
        const runGc = () => {
          clearComposerImageRegistry({
            registry,
            dedup: imageDedupRef.current,
            imagePreviewHideTimerRef,
            activePreviewImageIdRef,
            activePreviewChipRef,
            imagePreviewElRef,
          });
        };
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(runGc, { timeout: 800 });
        } else {
          setTimeout(runGc, 0);
        }
      }
      return;
    }

    const tokens = readTokensFromDom(el);
    const liveIds = new Set(
      tokens
        .filter((token) => token.type === "image")
        .map((token) => token.image.imageId),
    );
    if (liveIds.size < imageRegistryRef.current.size) {
      const snapshot = new Set(liveIds);
      const runGc = () => gcStaleImages(snapshot);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(runGc, { timeout: 800 });
      } else {
        setTimeout(runGc, 0);
      }
    }

    const payload = buildPayloadFromTokens(tokens);
    const empty = isComposerPayloadEmpty(payload);
    syncEmptyState(empty);
    const nextContent = buildJsonContentFromTokens(tokens);
    lastEmittedContentRef.current = nextContent;
    onContentChange?.(nextContent);
  }, [onContentChange, syncEmptyState, gcStaleImages]);

  return {
    editorHostRef,
    editorRef,
    placeholderRef,
    liveRegionRef,
    nativeHandlersRef,
    isComposingRef,
    isEmptyRef,
    lastEmittedContentRef,
    lastReceivedContentRef,
    imageRegistryRef,
    imageDedupRef,
    imagePreviewElRef,
    imagePreviewHideTimerRef,
    activePreviewImageIdRef,
    activePreviewChipRef,
    isEmpty,
    setIsEmpty,
    setPlaceholderVisible,
    syncEmptyState,
    emitCurrentContent,
  };
}

export type ComposerContentState = ReturnType<typeof useComposerContentState>;
