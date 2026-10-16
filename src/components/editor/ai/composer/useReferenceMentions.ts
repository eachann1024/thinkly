import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  type RefObject,
} from "react";
import {
  type AiFileReferenceAttrs,
  type AiReferenceSuggestionItem,
} from "./referenceLookup";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import {
  ensureComposerCaretAnchors,
  placeCaretAfterNode,
  pruneEmptyComposerTextNodes,
} from "./useSkillCommands";
import { isSuggestionMenuAcceptKey } from "@/components/editor/utils/slashMenuPolicy";

import { composerSuggestionReducer, inactiveSuggestion } from "./composerSuggestionState";
import { detectMentionAtCaret, resolveMentionAnchorRect, createChipElement, type DetectedMention } from "./composerMentionDom";
export { createChipElement } from "./composerMentionDom";

interface UseReferenceMentionsOptions {
  editorRef: RefObject<HTMLDivElement | null>;
  isComposingRef: RefObject<boolean>;
  onContentMutation: () => void;
  onReferenceAdded?: (reference: AiFileReferenceAttrs) => void;
  searchPages?: (query: string) => AiReferenceSuggestionItem[];
  referencePlacement?: "inline" | "external";
}

export function useReferenceMentions({
  editorRef,
  isComposingRef,
  onContentMutation,
  onReferenceAdded,
  searchPages: searchPagesOverride,
  referencePlacement = "inline",
}: UseReferenceMentionsOptions) {
  const { searchPages } = useEditorPageContext();
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDetectedRef = useRef<DetectedMention | null>(null);
  const [mention, dispatch] = useReducer(composerSuggestionReducer, inactiveSuggestion);

  const mentionQuery = mention.phase === "active" ? mention.query : "";
  const mentionItems = useMemo(
    () =>
      mention.phase === "active" ? (searchPagesOverride ?? searchPages)(mention.query) : [],
    [mention.phase, mentionQuery, searchPages, searchPagesOverride],
  );

  // Keep a ref so keyboard handler always sees current items without stale closure
  const mentionItemsRef = useRef(mentionItems);
  useEffect(() => {
    mentionItemsRef.current = mentionItems;
  }, [mentionItems]);

  const clearMentionState = useCallback(() => {
    lastDetectedRef.current = null;
    if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = null;
    dispatch({ type: "cleared" });
  }, []);

  const detectMention = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isComposingRef.current) return;

    const detected = detectMentionAtCaret(el);
    if (detected) {
      if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
      lastDetectedRef.current = detected;
      const rect = resolveMentionAnchorRect(detected.range, el);
      dispatch({ type: "detected", query: detected.query, anchorRect: rect });
    } else {
      lastDetectedRef.current = null;
      dispatch({ type: "cleared" });
    }
  }, [editorRef, isComposingRef]);

  const insertMention = useCallback(
    (item: AiReferenceSuggestionItem) => {
      const el = editorRef.current;
      if (!el) return;

      dispatch({ type: "cleared" });

      // Prefer the range captured at detection time — by the time we get here,
      // React may have re-rendered (popover mounting) and Chromium can reset the
      // live selection's anchor to the contenteditable container, which would
      // make a fresh detectMentionAtCaret() return null.
      const detected = lastDetectedRef.current ?? detectMentionAtCaret(el);
      lastDetectedRef.current = null;
      if (!detected) return;

      try {
        detected.range.deleteContents();
        if (referencePlacement === "inline") {
          // 间距靠 CSS；ZWSP 锚点保证旧 Chromium 光标可见。
          const chip = createChipElement(item);
          detected.range.insertNode(chip);
          pruneEmptyComposerTextNodes(el);
          ensureComposerCaretAnchors(el);
          // Focus BEFORE placing the cursor — calling focus() after addRange()
          // resets the selection in some browsers.
          el.focus({ preventScroll: true });
          placeCaretAfterNode(chip);
        } else {
          // Notebook AI keeps page context outside the editable prompt, so the
          // typed @query is removed and the caret stays at that position.
          const caretRange = document.createRange();
          caretRange.setStart(
            detected.range.startContainer,
            detected.range.startOffset,
          );
          caretRange.collapse(true);
          el.focus({ preventScroll: true });
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(caretRange);
          }
        }
      } catch {
        return;
      }

      onContentMutation();
      onReferenceAdded?.(item);
    },
    [editorRef, onContentMutation, onReferenceAdded, referencePlacement],
  );

  const handleMentionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (mention.phase !== "active") return false;

      const items = mentionItemsRef.current;
      const count = Math.max(1, items.length);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        dispatch({ type: "navigated", delta: 1, count });
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({ type: "navigated", delta: -1, count });
        return true;
      }
      // Shift+Enter 留给 composer 做换行；Enter / Tab 确认 @ 引用
      if (isSuggestionMenuAcceptKey(event)) {
        event.preventDefault();
        const item = items[mention.activeIndex];
        if (item) {
          insertMention(item);
        }
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearMentionState();
        return true;
      }

      return false;
    },
    [mention, insertMention, clearMentionState],
  );

  const handleMentionBlur = useCallback(() => {
    if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(clearMentionState, 150);
  }, [clearMentionState]);

  const cancelMentionBlurTimer = useCallback(() => {
    if (blurTimerRef.current !== null) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
  }, []);

  return {
    mention,
    mentionItems,
    detectMention,
    insertMention,
    handleMentionKeyDown,
    handleMentionBlur,
    cancelMentionBlurTimer,
    clearMentionState,
  };
}
