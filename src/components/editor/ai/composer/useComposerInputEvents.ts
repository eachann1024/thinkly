import { useCallback } from "react";
import {
  COMPOSER_CHIP_DELETE_FLUSH_MS,
  COMPOSER_DELETE_FLUSH_MS,
  COMPOSER_INPUT_FLUSH_MS,
  isComposerDeleteInputType,
  shouldProcessComposerInput,
} from "./composerInputGuards";
import {
  cleanupOrphanComposerZwspNodes,
  editorHasComposerChips,
  getComposerChipAfterCaret,
  getComposerChipBeforeCaret,
  isEditorDomEmpty,
  placeCaretInEditor,
  rangeContainsComposerChip,
  removeComposerChipsIntersectingRange,
  resolveComposerBeforeInputDelete,
  selectionCoversEntireEditor,
} from "./composerChipDom";
import type { ComposerContentState } from "./useComposerContentState";
import type { useComposerFlush } from "./useComposerFlush";

export function useComposerInputEvents(
  state: ComposerContentState,
  flush: ReturnType<typeof useComposerFlush>,
  clearMentionState: () => void,
  clearCommandState: () => void,
) {
  const { editorRef, isComposingRef, syncEmptyState } = state;
  const {
    imeSessionRef,
    pendingFlushRef,
    scheduleFlush,
    scheduleDetectOnly,
    touchImeSession,
  } = flush;
  const handleBeforeInputNative = useCallback(
    (event: Event) => {
      const native = event as InputEvent;
      const inputType = native.inputType ?? "";
      if (!isComposerDeleteInputType(inputType)) return;

      const imeActive =
        imeSessionRef.current ||
        isComposingRef.current ||
        native.isComposing === true ||
        inputType === "deleteCompositionText" ||
        inputType === "deleteByComposition";

      if (imeActive) return;
      const el = editorRef.current;
      if (!el || !editorHasComposerChips(el)) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (
        !el.contains(range.commonAncestorContainer) &&
        el !== range.commonAncestorContainer
      ) {
        if (!el.contains(range.startContainer)) return;
      }

      const coversEntire = !range.collapsed && selectionCoversEntireEditor(el, range);
      const containsChip = !range.collapsed && !coversEntire && rangeContainsComposerChip(range, el);
      const chipBefore = range.collapsed && inputType.endsWith("Backward")
        ? getComposerChipBeforeCaret(el, range) : null;
      const chipAfter = range.collapsed && inputType.endsWith("Forward")
        ? getComposerChipAfterCaret(el, range) : null;

      const action = resolveComposerBeforeInputDelete({
        inputType,
        imeActive,
        hasChips: true,
        selectionCoversEntire: coversEntire,
        rangeCollapsed: range.collapsed,
        rangeContainsChip: containsChip,
        chipBeforeCaret: Boolean(chipBefore),
        chipAfterCaret: Boolean(chipAfter),
      });

      if (action === "ignore") return;

      event.preventDefault();

      if (action === "clear-editor") {
        el.innerHTML = "";
        placeCaretInEditor(el, true);
        syncEmptyState(true);
        scheduleFlush(COMPOSER_CHIP_DELETE_FLUSH_MS);
        return;
      }

      if (action === "delete-selection-chips") {
        removeComposerChipsIntersectingRange(el, range);
        try {
          if (!range.collapsed) range.deleteContents();
        } catch {
        }
        cleanupOrphanComposerZwspNodes(el);
        syncEmptyState(isEditorDomEmpty(el));
        scheduleFlush(COMPOSER_CHIP_DELETE_FLUSH_MS);
        return;
      }

      if (action === "remove-chip-before" && chipBefore) {
        chipBefore.remove();
        cleanupOrphanComposerZwspNodes(el);
        syncEmptyState(isEditorDomEmpty(el));
        scheduleFlush(COMPOSER_CHIP_DELETE_FLUSH_MS);
        return;
      }

      if (action === "remove-chip-after" && chipAfter) {
        chipAfter.remove();
        cleanupOrphanComposerZwspNodes(el);
        syncEmptyState(isEditorDomEmpty(el));
        scheduleFlush(COMPOSER_CHIP_DELETE_FLUSH_MS);
      }
    },
    [editorRef, isComposingRef, imeSessionRef, scheduleFlush, syncEmptyState],
  );

  const handleInputNative = useCallback(
    (event: Event) => {
      const native = event as InputEvent;
      const inputType = native.inputType ?? "";
      const looksLikeImeInput =
        native.isComposing === true ||
        inputType === "insertCompositionText" ||
        inputType === "deleteCompositionText" ||
        inputType === "insertFromComposition" ||
        inputType === "deleteByComposition";

      if (looksLikeImeInput) {
        touchImeSession();
        return;
      }

      if (
        !shouldProcessComposerInput({
          isComposingFlag: isComposingRef.current,
          imeSessionActive: imeSessionRef.current,
          inputEventIsComposing: native.isComposing,
        })
      ) {
        pendingFlushRef.current = true;
        return;
      }

      const el = editorRef.current;
      if (el && isEditorDomEmpty(el)) {
        syncEmptyState(true);
        clearMentionState();
        clearCommandState();
        scheduleFlush(COMPOSER_DELETE_FLUSH_MS);
        return;
      }
      syncEmptyState(false);
      const isDelete = isComposerDeleteInputType(inputType);
      scheduleFlush(
        !isDelete ? COMPOSER_INPUT_FLUSH_MS :
          el && editorHasComposerChips(el) ? COMPOSER_CHIP_DELETE_FLUSH_MS : COMPOSER_DELETE_FLUSH_MS,
      );
      if (!isDelete) {
        scheduleDetectOnly(0);
      }
    },
    [
      imeSessionRef,
      pendingFlushRef,
      scheduleFlush,
      scheduleDetectOnly,
      syncEmptyState,
      editorRef,
      isComposingRef,
      touchImeSession,
      clearMentionState,
      clearCommandState,
    ],
  );

  return { handleBeforeInputNative, handleInputNative };
}
