import { useEffect } from "react";
import { placeCaretInEditor } from "./composerChipDom";
import {
  buildPayloadFromTokens,
  isComposerPayloadEmpty,
  readTokensFromDom,
  setDomFromJsonContent,
} from "./composerTokens";
import type { AiComposerInputProps } from "./composerInputTypes";
import type { ComposerContentState } from "./useComposerContentState";

export function useComposerDraftSync(
  props: AiComposerInputProps,
  state: ComposerContentState,
  syncReferenceTitles: () => void,
) {
  const { initialContent, autoFocusToken, onIsEmptyChange } = props;
  const {
    editorRef,
    lastReceivedContentRef,
    lastEmittedContentRef,
    imageRegistryRef,
    isEmptyRef,
    setIsEmpty,
  } = state;

  useEffect(() => {
    if (initialContent === lastReceivedContentRef.current) return;
    lastReceivedContentRef.current = initialContent;
    if (initialContent === lastEmittedContentRef.current) return;
    lastEmittedContentRef.current = initialContent;
    const el = editorRef.current;
    if (!el) return;
    setDomFromJsonContent(el, initialContent, imageRegistryRef.current);
    syncReferenceTitles();
    const tokens = readTokensFromDom(el);
    const empty = isComposerPayloadEmpty(buildPayloadFromTokens(tokens));
    isEmptyRef.current = empty;
    setIsEmpty(empty);
    onIsEmptyChange?.(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent, syncReferenceTitles]);


  useEffect(() => {
    if (autoFocusToken <= 0) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    placeCaretInEditor(el, false);
  }, [autoFocusToken]);
}
