import { showPageWriteSkeleton } from "./pageWriteSkeleton";
import type { PageWriteTransition } from "@/lib/notebook-ai/pageWriteTransition";
import { useLayoutEffect, useRef } from "react";
import { reloadEditorPage } from "./reloadEditorPage";
import {
  clonePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { useEditorHostFocus } from "./useEditorHostFocus";
import type { EditorRuntime } from "./useEditorSession";
import type { EditorContentCommit } from "./useEditorContentCommit";

export function useEditorHostEvents(
  runtime: EditorRuntime,
  contentCommit: EditorContentCommit,
  focusEditorSafely: () => void,
  isActiveEditor: boolean,
) {
  const { commitEditorContent, debouncedUpdate } = contentCommit;
  const latestRuntime = useRef(runtime);
  latestRuntime.current = runtime;
  const suspendedSource = useRef<{ pageId: string; content: unknown } | null>(null);
  const {
    editor,
    pageRef,
    pageIdForUpdateRef,
    contentModeRef,
    editorContainerRef,
    pendingEditorChangeRef,
  } = runtime;
  useEditorHostFocus(runtime, focusEditorSafely, isActiveEditor);

  const transitionController = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    transitionController.current = controller;
    return () => controller.abort();
  }, [editor, runtime.activePageId]);

  useLayoutEffect(() => {
    const boundPageId = runtime.activePageId;
    const current = latestRuntime.current;
    const page = current.getLatestPage?.(boundPageId ?? "") ?? pageRef.current;
    const suspended = suspendedSource.current;
    if (page && suspended?.pageId === page.id && suspended.content !== page.content &&
        !pendingEditorChangeRef.current) {
      reloadEditorPage(current, contentCommit, page.id);
    }
    const handleFlush = (event: Event) => {
      const customEvent = event as CustomEvent<{ immediate?: boolean }>;
      if (customEvent.detail?.immediate) {
        commitEditorContent();
        return;
      }
      commitEditorContent();
    };

    const handleReloadActiveEditor = (event: Event) => {
      const detail = (event as CustomEvent<{ pageId?: string }>).detail;
      if (!detail?.pageId && !isActiveEditor) return;
      const targetId = detail?.pageId ?? pageRef.current?.id;
      if (targetId) reloadEditorPage(latestRuntime.current, contentCommit, targetId);
    };

    const handlePrepareWrite = (event: Event) => {
      const detail = (event as CustomEvent<PageWriteTransition>).detail;
      if (detail.pageId !== pageIdForUpdateRef.current) return;
      detail.pending.push(showPageWriteSkeleton(editor.prosemirrorView, transitionController.current!.signal));
    };
    window.addEventListener("goose-note:prepare-page-write", handlePrepareWrite);

    const handleAssetReferences = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          pages: { localFilePath: string; content: unknown }[];
          failed: boolean;
        }>
      ).detail;
      const localFilePath = pageRef.current?.localFilePath;
      if (!localFilePath) return;
      try {
        detail.pages.push({
          localFilePath,
          content: clonePageContent(editor.document as BlockNoteContent),
        });
      } catch {
        detail.failed = true;
      }
    };
    window.addEventListener(
      "goose-note:asset-references",
      handleAssetReferences,
    );
    window.addEventListener("goose-note:flush-editor", handleFlush);
    window.addEventListener(
      "goose-note:reload-active-editor",
      handleReloadActiveEditor,
    );

    return () => {
      // Activity cleanup runs before its refs disconnect. Record the source
      // after flushing so our own save is not mistaken for an external edit.
      if (boundPageId) commitEditorContent(boundPageId);
      const current = latestRuntime.current;
      const page = current.getLatestPage?.(boundPageId ?? "") ?? pageRef.current;
      suspendedSource.current = page?.id === boundPageId ? { pageId: page.id, content: page.content } : null;
      window.removeEventListener("goose-note:prepare-page-write", handlePrepareWrite);
      window.removeEventListener(
        "goose-note:asset-references",
        handleAssetReferences,
      );
      window.removeEventListener("goose-note:flush-editor", handleFlush);
      window.removeEventListener(
        "goose-note:reload-active-editor",
        handleReloadActiveEditor,
      );
    };
  }, [
    transitionController,
    isActiveEditor,
    runtime.activePageId,
    commitEditorContent,
    debouncedUpdate,
    editor,
    contentModeRef,
    editorContainerRef,
    pageIdForUpdateRef,
    pageRef,
    pendingEditorChangeRef,
  ]);
}
