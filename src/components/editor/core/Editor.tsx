import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { createEditorSafeContent } from "@/components/editor/utils/blocknote-content";
import { useEditorShortcuts } from "@/components/editor/hooks/useEditorShortcuts";
import { useEditorPaste } from "@/components/editor/hooks/useEditorPaste";
import { EditorComposer } from "./EditorComposer";
import { editorSchema } from "./schema";
import { useEditorSession } from "./useEditorSession";
import { useEditorExtensions } from "./useEditorExtensions";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { useEditorLocale } from "./useEditorLocale";
import { createEditorOptions } from "./createEditorOptions";
import { getCachedContentSignature } from "./editorContentPolicy";
import { noteFastOpen, sourceLooksHeavy } from "./fastBlockToNode";
import { useEditorContentCommit } from "./useEditorContentCommit";
import { useEditorPageLifecycle } from "./useEditorPageLifecycle";
import { useEditorFocus } from "./useEditorFocus";
import { useEditorClipboard } from "./useEditorClipboard";
import { useEditorFileDrop } from "./useEditorFileDrop";
import { useEditorHostEvents } from "./useEditorHostEvents";
import { useDocumentTitleNavigation } from "./useDocumentTitleNavigation";
import { useEditorPresentation } from "./useEditorPresentation";
import type { EditorRef, EditorProps } from "./editorTypes";
export type { EditorRef } from "./editorTypes";

export const Editor = forwardRef<EditorRef, EditorProps>(function Editor(
  {
    editable = true,
    isActiveEditor = true,
    spellCheck = false,
    hiddenSlashItemTitles,
    showSideMenu = true,
  },
  ref,
) {
  const session = useEditorSession(editable);
  const extensions = useEditorExtensions(session);
  const {
    page,
    normalizeContent,
    syncedContentSignatureRef,
    editorInstanceRef,
  } = session;
  const fastOpen = useRef(sourceLooksHeavy(page?.content));
  const [initialContent] = useState(() =>
    fastOpen.current
      ? [{ type: "paragraph", content: "" }] as ReturnType<typeof createEditorSafeContent>
      : createEditorSafeContent(normalizeContent(page?.content), editorSchema),
  );
  // 初次 mount 时给 syncedContentSignatureRef 设置基线，
  // 否则切走时 flush 会把"只读打开"误判成编辑、刷新 updatedAt。
  if (syncedContentSignatureRef.current === null) {
    syncedContentSignatureRef.current = getCachedContentSignature(
      initialContent,
    );
  }
  const editor = useCreateBlockNote(
    createEditorOptions(
      session,
      initialContent,
      extensions,
      spellCheck,
    ),
    [],
  );
  useEditorLocale(editor, isQuickNoteEditorPage(page) ? "quicknote" : "note");
  editorInstanceRef.current = editor;
  if (fastOpen.current) {
    fastOpen.current = false;
    noteFastOpen(editor, page?.content);
  }
  const runtime = { ...session, editor };
  useEditorFileDrop(runtime, editable);
  useDocumentTitleNavigation(runtime, editable);
  const contentCommit = useEditorContentCommit(runtime);
  useEditorPageLifecycle(runtime, contentCommit, editable, isActiveEditor);
  const { handleEditorBlankMouseDown, focusEditorSafely } = useEditorFocus(
    runtime,
    editable,
    isActiveEditor,
  );
  const { handleEditorPasteCapture } = useEditorPaste({
    editor,
    editable,
    shiftPressedRef: session.shiftPressedRef,
  });
  useEditorShortcuts({ shiftPressedRef: session.shiftPressedRef });
  useEditorClipboard(runtime);
  useEditorHostEvents(
    runtime,
    contentCommit,
    focusEditorSafely,
    isActiveEditor,
  );
  const { getSlashItems, effectiveTheme } = useEditorPresentation(
    runtime,
    isActiveEditor,
    hiddenSlashItemTitles,
  );
  useImperativeHandle(
    ref,
    () => ({
      editor,
    }),
    [editor],
  );

  const {
    editorContainerRef,
    pageIdForUpdateRef,
    pendingEditorChangeRef,
    userInteractedRef,
    silentContentSync,
    isEditorFullWidth,
    searchProviders,
    customActions,
    suppressFormattingToolbar,
    usesRawEditorContent,
  } = session;
  const { debouncedUpdate } = contentCommit;
  if (!page) return null;

  return (
    <EditorComposer
      editor={editor}
      editable={editable}
      isActiveEditor={isActiveEditor}
      page={page}
      editorContainerRef={editorContainerRef}
      handleEditorBlankMouseDown={handleEditorBlankMouseDown}
      handleEditorPasteCapture={handleEditorPasteCapture}
      getSlashItems={getSlashItems}
      pageIdForUpdateRef={pageIdForUpdateRef}
      syncedContentSignatureRef={syncedContentSignatureRef}
      pendingEditorChangeRef={pendingEditorChangeRef}
      debouncedUpdate={debouncedUpdate}
      userInteractedRef={userInteractedRef}
      silentContentSync={silentContentSync}
      isEditorFullWidth={isEditorFullWidth}
      effectiveTheme={effectiveTheme}
      searchProviders={searchProviders}
      customActions={customActions}
      showSideMenu={showSideMenu}
      suppressFormattingToolbar={suppressFormattingToolbar}
      usesRawEditorContent={usesRawEditorContent}
    />
  );
});
