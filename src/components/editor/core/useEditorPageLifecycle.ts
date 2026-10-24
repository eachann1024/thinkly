import { useEffect, useLayoutEffect, useRef } from "react";
import { EditorState, type Transaction } from "@tiptap/pm/state";
import { GooseAIExtension } from "@/components/editor/ai/GooseAIExtension";
import {
  clonePageContent,
  createEditorSafeContent,
  getContentSignature,
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { pageUndoHistory } from "./pageUndoHistory";
import { replacePageContent } from "./replacePageContent";
import { markProgrammaticRead } from "./programmaticRead";
import {
  toEditorBlocks,
  getCachedContentSignature,
} from "./editorContentPolicy";
import type { EditorRuntime } from "./useEditorSession";
import type { EditorContentCommit } from "./useEditorContentCommit";
import { sourceLooksHeavy, takeFastOpen } from "./fastBlockToNode";

export function useEditorPageLifecycle(
  runtime: EditorRuntime,
  { debouncedUpdate }: EditorContentCommit,
  editable: boolean,
  isActiveEditor: boolean,
) {
  const {
    editor,
    activePageId,
    page,
    userInteractedRef,
    pendingEditorChangeRef,
    pageRef,
    pageIdForUpdateRef,
    contentModeRef,
    syncedContentSignatureRef,
    onContentChangeRef,
    getLatestPage,
  } = runtime;
  useLayoutEffect(() => {
    if (!__GOOSE_EDITOR_AI__) return;
    const inlineAi = editor.getExtension(GooseAIExtension);
    return () => inlineAi?.detachPage();
  }, [editor, activePageId]);

  useEffect(() => {
    if (editor.isEditable === editable) return;
    editor.isEditable = editable;
  }, [editor, editable]);
  const prevPageIdRef = useRef<string | null>(activePageId);
  const sourceRef = useRef({ page, mode: contentModeRef.current });
  if (activePageId === prevPageIdRef.current) {
    sourceRef.current = { page, mode: contentModeRef.current };
  }
  const saveSnapshot = () => {
    const id = prevPageIdRef.current;
    if (!id) return;
    const source = getLatestPage?.(id) ?? sourceRef.current.page;
    const mode = sourceRef.current.mode;
    const untouched = !userInteractedRef.current && syncedContentSignatureRef.current;
    const blocks = untouched ? null : editor.document as BlockNoteContent;
    const signature = untouched ? syncedContentSignatureRef.current! : getContentSignature(blocks);
    const syncedSignature = untouched
      ? syncedContentSignatureRef.current
      : mode === "raw" ? signature : getCachedContentSignature(normalizePageContent(blocks));
    const cachedSource = source && getCachedContentSignature(source.content) === syncedSignature
      ? { content: source.content, mode, syncedSignature } : undefined;
    pageUndoHistory.save(id, editor.prosemirrorState, signature, cachedSource);
  };
  const saveSnapshotRef = useRef(saveSnapshot);
  saveSnapshotRef.current = saveSnapshot;
  useLayoutEffect(() => {
    if (__GOOSE_EDITOR_AI__)
      editor.getExtension(GooseAIExtension)?.detachPage();
    if (activePageId === prevPageIdRef.current) {
      const pending = takeFastOpen(editor);
      if (pending !== undefined) {
        const isLocalPage = contentModeRef.current === "raw";
        const nextContent = isLocalPage ? toEditorBlocks(pending) : normalizePageContent(pending);
        const blocks = createEditorSafeContent(nextContent, editor.schema);
        syncedContentSignatureRef.current = getCachedContentSignature(
          sourceLooksHeavy(pending) ? pending : blocks,
        );
        markProgrammaticRead(editor);
        editor.transact((tr: Transaction) => replacePageContent(tr, blocks as any));
      }
      if (activePageId) {
        const view = editor.prosemirrorView;
        const signature = !userInteractedRef.current && syncedContentSignatureRef.current
          ? syncedContentSignatureRef.current
          : getContentSignature(editor.document);
        const restored = pageUndoHistory.restore(
          activePageId,
          view.state,
          signature,
        );
        if (restored !== view.state) {
          markProgrammaticRead(editor);
          view.updateState(restored);
        }
      }
      return;
    }
    saveSnapshotRef.current();
    prevPageIdRef.current = activePageId;

    userInteractedRef.current = false;
    pendingEditorChangeRef.current = false;

    debouncedUpdate.cancel();

    const p = pageRef.current;
    pageIdForUpdateRef.current = p?.id ?? null;
    sourceRef.current = { page: p, mode: contentModeRef.current };
    const view = editor.prosemirrorView;
    const cached = p && pageUndoHistory.restoreCached(
      p.id, view.state, p.content, contentModeRef.current,
    );
    if (cached) {
      syncedContentSignatureRef.current = cached.syncedSignature;
      markProgrammaticRead(editor);
      view.updateState(cached.state);
      return;
    }


    const isLocalPage = contentModeRef.current === "raw";
    const nextContent = isLocalPage
      ? toEditorBlocks(p?.content)
      : normalizePageContent(p?.content);
    const nextEditorContent = createEditorSafeContent(
      nextContent,
      editor.schema,
    );
    const heavySource = sourceLooksHeavy(p?.content ?? nextContent);
    const nextSig = getCachedContentSignature(heavySource ? (p?.content ?? nextContent) : nextEditorContent);

    syncedContentSignatureRef.current = nextSig;

    markProgrammaticRead(editor);
    let replacedSize = 0;
    try {
      editor.transact((tr: Transaction) => {
        replacePageContent(tr, nextEditorContent as any);
        replacedSize = tr.doc.nodeSize;
      });
    } catch (error) {
      console.error(
        "[goose-note] replace editor blocks failed during page switch",
        {
          pageId: p?.id,
          error,
        },
      );
      const fallbackContent = createEditorSafeContent(undefined, editor.schema);
      editor.replaceBlocks(editor.document, fallbackContent as any);
      replacedSize = 0;
    }

    const heavy = replacedSize > 20000;
    const pageId = p?.id ?? null;
    if (!heavy) {
      const postReplaceRaw = clonePageContent(editor.document as BlockNoteContent);
      syncedContentSignatureRef.current = getCachedContentSignature(
        isLocalPage ? postReplaceRaw : normalizePageContent(postReplaceRaw),
      );
    } else {
      const reconcile = () => {
        if (pageIdForUpdateRef.current !== pageId || userInteractedRef.current) return;
        const postReplaceRaw = clonePageContent(editor.document as BlockNoteContent);
        syncedContentSignatureRef.current = getCachedContentSignature(
          isLocalPage ? postReplaceRaw : normalizePageContent(postReplaceRaw),
        );
      };
      if (typeof requestIdleCallback === "function") requestIdleCallback(reconcile, { timeout: 1500 });
      else window.setTimeout(reconcile, 300);
    }

    if (view) {
      const newState = EditorState.create({
        doc: view.state.doc,
        plugins: view.state.plugins,
      });
      view.updateState(
        activePageId
          ? pageUndoHistory.restore(
              activePageId,
              newState,
              syncedContentSignatureRef.current ?? nextSig,
            )
          : newState,
      );
    }

    const normalizedSig = getCachedContentSignature(nextContent);
    if (
      p &&
      !isLocalPage &&
      getCachedContentSignature(p.content) !== normalizedSig
    ) {
      onContentChangeRef.current(nextContent, { silent: true });
    }

    userInteractedRef.current = false;
  }, [activePageId, debouncedUpdate, editor]);

  useLayoutEffect(() => {
    if (__GOOSE_EDITOR_AI__)
      editor.getExtension(GooseAIExtension)?.attachPage(page.id);
  }, [
    editor,
    activePageId,
    page.id,
    editable,
    page.isLocked,
    page.trashedAt,
    page.localReadState,
  ]);

  useLayoutEffect(() => {
    if (editor._tiptapEditor.isDestroyed) return;
    editor.prosemirrorView.dom.dataset.searchPageId = activePageId ?? "";
    window.dispatchEvent(new CustomEvent("goose-note:search-editor-ready"));
  }, [activePageId, editor]);

  useLayoutEffect(
    () => () => {
      saveSnapshotRef.current();
    },
    [editor],
  );

  useEffect(() => {
    if (isActiveEditor && activePageId) pageUndoHistory.visit(activePageId);
  }, [activePageId, isActiveEditor]);
}
