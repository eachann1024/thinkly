import { useEffect } from "react";
import {
  clonePageContent,
  createEditorSafeContent,
  getContentSignature,
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { toEditorBlocks } from "./editorContentPolicy";
import { replacePageContent } from "./replacePageContent";
import { markProgrammaticRead } from "./programmaticRead";
import type { Transaction } from "@tiptap/pm/state";
import { useEditorHostFocus } from "./useEditorHostFocus";
import { useEditorPageTasks } from "./useEditorPageTasks";
import type { EditorRuntime } from "./useEditorSession";
import type { EditorContentCommit } from "./useEditorContentCommit";

export function useEditorHostEvents(
  runtime: EditorRuntime,
  { commitEditorContent, debouncedUpdate }: EditorContentCommit,
  focusEditorSafely: () => void,
  isActiveEditor: boolean,
) {
  const {
    editor,
    pageRef,
    pageIdForUpdateRef,
    getLatestPage,
    contentModeRef,
    editorContainerRef,
    pendingEditorChangeRef,
    syncedContentSignatureRef,
    userInteractedRef,
  } = runtime;
  useEditorHostFocus(runtime, focusEditorSafely, isActiveEditor);
  const tasks = useEditorPageTasks(runtime);
  useEffect(() => {
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
      const activePage = pageRef.current;
      const activeId = activePage?.id ?? null;
      const targetId = detail?.pageId ?? activeId;
      if (!targetId || targetId !== activeId) return;
      if (targetId !== pageIdForUpdateRef.current) return;
      const livePage = getLatestPage?.(targetId) ?? pageRef.current;
      if (!livePage) return;
      const isLocalPage = contentModeRef.current === "raw";
      const nextContent = isLocalPage
        ? toEditorBlocks(livePage.content)
        : normalizePageContent(livePage.content);
      const nextEditorContent = createEditorSafeContent(
        nextContent,
        editor.schema,
      );
      const currentRaw = clonePageContent(editor.document as BlockNoteContent);
      const currentSignature = getContentSignature(
        isLocalPage ? currentRaw : normalizePageContent(currentRaw),
      );
      const nextSignature = getContentSignature(nextEditorContent);

      if (nextSignature === currentSignature) {
        syncedContentSignatureRef.current = currentSignature;
        return;
      }
      const scrollContainer = editorContainerRef.current?.closest<HTMLElement>(
        ".page-scroll-container",
      );
      const scrollTop = scrollContainer?.scrollTop;
      debouncedUpdate.cancel();
      pendingEditorChangeRef.current = false;
      try {
        markProgrammaticRead(editor);
        editor.transact((tr: Transaction) => replacePageContent(tr, nextEditorContent as any));
      } catch (error) {
        console.error(
          "[goose-note] replace editor blocks failed during reload",
          {
            pageId: livePage.id,
            error,
          },
        );
        const fallbackContent = createEditorSafeContent(
          undefined,
          editor.schema,
        );
        editor.transact((tr: Transaction) => replacePageContent(tr, fallbackContent as any));
      }
      const reloadedRaw = clonePageContent(editor.document as BlockNoteContent);
      syncedContentSignatureRef.current = getContentSignature(
        isLocalPage ? reloadedRaw : normalizePageContent(reloadedRaw),
      );
      userInteractedRef.current = false;
      if (scrollContainer && typeof scrollTop === "number") {
        tasks.frame(() => {
          scrollContainer.scrollTop = scrollTop;
        });
      }
    };

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
    commitEditorContent,
    debouncedUpdate,
    editor,
    getLatestPage,
    contentModeRef,
    editorContainerRef,
    pageIdForUpdateRef,
    pageRef,
    pendingEditorChangeRef,
    syncedContentSignatureRef,
    userInteractedRef,
    tasks,
  ]);
}
