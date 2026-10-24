import { useCallback, useEffect, useRef, type RefObject } from "react";
import { isEditorDomEmpty } from "./composerChipDom";

export function useComposerFlush(options: {
  editorRef: RefObject<HTMLDivElement | null>;
  isComposingRef: RefObject<boolean>;
  detectMention: () => void;
  detectCommand: () => void;
  clearMentionState: () => void;
  clearCommandState: () => void;
  emitCurrentContent: () => void;
  setPlaceholderVisible: (visible: boolean) => void;
}) {
  const {
    editorRef,
    isComposingRef,
    detectMention,
    detectCommand,
    clearMentionState,
    clearCommandState,
    emitCurrentContent,
    setPlaceholderVisible,
  } = options;

  const imeSessionRef = useRef(false);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRafRef = useRef<number | null>(null);
  const pendingFlushRef = useRef(false);

  const flushComposerSideEffects = useCallback(() => {
    pendingFlushRef.current = false;
    const el = editorRef.current;
    if (el && !isEditorDomEmpty(el)) {
      detectMention();
      detectCommand();
    } else {
      clearMentionState();
      clearCommandState();
    }
    emitCurrentContent();
  }, [
    editorRef,
    emitCurrentContent,
    detectMention,
    detectCommand,
    clearMentionState,
    clearCommandState,
  ]);

  const cancelFlushTimer = useCallback(() => {
    if (flushTimerRef.current != null) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (flushRafRef.current != null) {
      cancelAnimationFrame(flushRafRef.current);
      flushRafRef.current = null;
    }
  }, []);

  const cancelDetectTimer = useCallback(() => {
    if (detectTimerRef.current != null) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
  }, []);

  const scheduleDetectOnly = useCallback(
    (delayMs: number) => {
      cancelDetectTimer();
      detectTimerRef.current = setTimeout(() => {
        detectTimerRef.current = null;
        if (imeSessionRef.current || isComposingRef.current) return;
        const el = editorRef.current;
        if (!el || isEditorDomEmpty(el)) {
          clearMentionState();
          clearCommandState();
          return;
        }
        detectMention();
        detectCommand();
      }, delayMs);
    },
    [
      editorRef,
      isComposingRef,
      cancelDetectTimer,
      clearMentionState,
      clearCommandState,
      detectMention,
      detectCommand,
    ],
  );

  const scheduleFlush = useCallback(
    (delayMs: number) => {
      cancelFlushTimer();
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        if (imeSessionRef.current || isComposingRef.current) {
          pendingFlushRef.current = true;
          return;
        }
        flushRafRef.current = requestAnimationFrame(() => {
          flushRafRef.current = requestAnimationFrame(() => {
            flushRafRef.current = null;
            if (imeSessionRef.current || isComposingRef.current) {
              pendingFlushRef.current = true;
              return;
            }
            flushComposerSideEffects();
          });
        });
      }, delayMs);
    },
    [cancelFlushTimer, flushComposerSideEffects, isComposingRef],
  );

  const touchImeSession = useCallback(() => {
    imeSessionRef.current = true;
    isComposingRef.current = true;
    pendingFlushRef.current = true;
    cancelFlushTimer();
    setPlaceholderVisible(false);
  }, [cancelFlushTimer, isComposingRef, setPlaceholderVisible]);

  const endImeSession = useCallback(() => {
    if (!imeSessionRef.current && !isComposingRef.current) {
      if (pendingFlushRef.current) scheduleFlush(0);
      return;
    }
    imeSessionRef.current = false;
    isComposingRef.current = false;
    scheduleFlush(0);
  }, [isComposingRef, scheduleFlush]);

  useEffect(() => {
    return () => {
      cancelFlushTimer();
      cancelDetectTimer();
    };
  }, [cancelFlushTimer, cancelDetectTimer]);

  return {
    imeSessionRef,
    pendingFlushRef,
    flushComposerSideEffects,
    cancelFlushTimer,
    scheduleDetectOnly,
    scheduleFlush,
    touchImeSession,
    endImeSession,
  };
}
