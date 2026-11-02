import { useEffect, type RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import { usePages } from "@/stores/usePages";
import { consumeNotebookAiReference, pendingNotebookAiReference, subscribeNotebookAiReference } from "@/lib/notebook-ai/navigateReference";
import type { NoteBlockLocation } from "@/lib/notebook-ai/noteCitation";
import { clearCitationHighlight, highlightCitationBlock } from "@/components/editor/extensions/citationHighlightExtension";
import "./note-citation.css";

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

function findBlock(root: HTMLElement, location: NoteBlockLocation): HTMLElement | undefined {
  // BlockNote can expose the same ID on both its outer and inner containers.
  const blocks = [...root.querySelectorAll<HTMLElement>(".bn-block-outer[data-id]")];
  if (location.blockId) return blocks.find(block => block.dataset.id === location.blockId);
  const ownText = (block: HTMLElement) => normalize(block.querySelector(".bn-block-content")?.textContent ?? "");
  const guard = normalize(location.text);
  // The model copies this text into its links and can garble a character or two.
  const close = (block: HTMLElement) => {
    const text = ownText(block);
    if (text.startsWith(guard)) return true;
    if (guard.length < 8 || text.length < guard.length) return false;
    let same = 0;
    for (let i = 0; i < guard.length; i++) if (text[i] === guard[i]) same++;
    return same / guard.length >= 0.9;
  };
  const indexed = blocks[location.blockIndex];
  if (indexed && guard && close(indexed)) return indexed;
  // ID-less legacy blocks can move. Only a unique text match is safe to use.
  const matches = guard ? blocks.filter(close) : [];
  return matches.length === 1 ? matches[0] : undefined;
}

export function useNoteCitationNavigation({ pageId, focused, editorRef, scrollRef, cancelPendingRestoration }: {
  pageId: string;
  focused: boolean;
  editorRef: RefObject<EditorRef | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  cancelPendingRestoration: () => void;
}) {
  useEffect(() => {
    if (!focused) return;
    let frame = 0, timer = 0;
    const clear = () => {
      window.clearTimeout(timer);
      const editor = editorRef.current?.editor;
      if (editor && !editor._tiptapEditor.isDestroyed) clearCitationHighlight(editor.prosemirrorView);
    };
    const locate = () => {
      cancelAnimationFrame(frame);
      const request = pendingNotebookAiReference();
      if (!request || request.pageId !== pageId) { clear(); return; }
      // Run after both document replacement and the pane's scroll restoration.
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
        if (pendingNotebookAiReference() !== request) return;
        const editor = editorRef.current?.editor;
        const root = editor && !editor._tiptapEditor.isDestroyed ? editor.prosemirrorView.dom : null;
        const scroller = scrollRef.current;
        const page = usePages.getState().pages[pageId];
        if (!root || root.dataset.searchPageId !== pageId || !scroller?.getClientRects().length ||
            !page || (page.localFilePath && page.localReadState !== "ready")) {
          locate(); return;
        }
        consumeNotebookAiReference(request);
        clear();
        const block = findBlock(root, request.location);
        if (!block) return;
        cancelPendingRestoration();
        const target = block.querySelector<HTMLElement>(".bn-block-content") ?? block;
        const box = target.getBoundingClientRect(), viewport = scroller.getBoundingClientRect();
        const top = scroller.scrollTop + box.top - viewport.top - (scroller.clientHeight - box.height) / 2;
        scroller.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        // A view decoration: no document step, selection change or undo entry.
        if (highlightCitationBlock(editor.prosemirrorView, target)) timer = window.setTimeout(clear, 2500);
      }); });
    };
    const unsubscribe = subscribeNotebookAiReference(locate);
    window.addEventListener("goose-note:search-editor-ready", locate);
    locate();
    return () => {
      cancelAnimationFrame(frame); clear(); unsubscribe();
      window.removeEventListener("goose-note:search-editor-ready", locate);
    };
  }, [pageId, focused, editorRef, scrollRef, cancelPendingRestoration]);
}
