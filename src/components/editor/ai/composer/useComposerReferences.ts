import { useCallback, useEffect } from "react";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import {
  buildAiFileReferenceAttrs,
  type AiFileReferenceAttrs,
} from "./referenceLookup";
import {
  appendSelectionQuoteToDom,
  type AiSelectionQuoteAttrs,
} from "./selectionQuote";
import { createChipElement } from "./useReferenceMentions";
import {
  ensureComposerCaretAnchors,
  pruneEmptyComposerTextNodes,
  placeCaretAfterNode,
} from "./composerCaret";
import type { ComposerContentState } from "./useComposerContentState";

export function useComposerReferences(state: ComposerContentState) {
  const { editorRef, liveRegionRef, emitCurrentContent } =
    state;
  const syncReferenceTitles = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const pages = usePages.getState().pages;
    const notebooks = useNotebooks.getState().notebooks;
    let changed = false;
    for (const chip of el.querySelectorAll<HTMLElement>(
      "[data-ai-mention-attrs]",
    )) {
      try {
        const attrs = JSON.parse(
          chip.dataset.aiMentionAttrs!,
        ) as AiFileReferenceAttrs;
        const page = pages[attrs.pageId];
        if (!page) continue;
        const current = buildAiFileReferenceAttrs(page, notebooks);
        if (
          attrs.titleSnapshot === current.titleSnapshot &&
          attrs.localFilePath === current.localFilePath
        )
          continue;
        const next = { ...attrs, ...current };
        chip.dataset.aiMentionAttrs = JSON.stringify(next);
        chip.textContent = `@${next.titleSnapshot}`;
        changed = true;
      } catch {
      }
    }
    if (changed) emitCurrentContent();
  }, [emitCurrentContent]);

  useEffect(
    () => usePages.subscribe(syncReferenceTitles),
    [syncReferenceTitles],
  );

  const insertReference = useCallback(
    (reference: AiFileReferenceAttrs) => {
      const el = editorRef.current;
      if (!el) return;

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

      const chip = createChipElement(reference);
      range.insertNode(chip);
      pruneEmptyComposerTextNodes(el);
      ensureComposerCaretAnchors(el);
      placeCaretAfterNode(chip);

      emitCurrentContent();
    },
    [emitCurrentContent],
  );

  const appendSelectionQuote = useCallback(
    (
      quote: AiSelectionQuoteAttrs,
      options?: { restoreCaret?: boolean; animate?: boolean },
    ): "appended" | "duplicate" | "skipped" => {
      const el = editorRef.current;
      if (!el) return "skipped";

      const active = document.activeElement;
      const composerFocused = Boolean(
        active && (el === active || el.contains(active)),
      );

      const result = appendSelectionQuoteToDom(el, quote, {
        animate: options?.animate === true,
        restoreCaret: options?.restoreCaret ?? composerFocused,
        liveRegion: liveRegionRef.current,
      });
      if (result === "appended") {
        emitCurrentContent();
      }
      return result;
    },
    [emitCurrentContent],
  );

  return {
    syncReferenceTitles,
    insertReference,
    appendSelectionQuote,
  };
}

export type ComposerReferences = ReturnType<typeof useComposerReferences>;
