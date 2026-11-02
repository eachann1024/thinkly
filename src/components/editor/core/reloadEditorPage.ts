import type { Transaction } from "@tiptap/pm/state";
import {
  clonePageContent, createEditorSafeContent, getContentSignature,
  normalizePageContent, type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { toEditorBlocks } from "./editorContentPolicy";
import { markProgrammaticRead } from "./programmaticRead";
import { replacePageContent } from "./replacePageContent";
import type { EditorRuntime } from "./useEditorSession";
import type { EditorContentCommit } from "./useEditorContentCommit";

export function reloadEditorPage(
  runtime: EditorRuntime,
  { debouncedUpdate }: EditorContentCommit,
  targetId: string,
) {
  const { editor, pageRef, pageIdForUpdateRef, getLatestPage, contentModeRef,
    editorContainerRef, pendingEditorChangeRef, syncedContentSignatureRef, userInteractedRef } = runtime;
  if (targetId !== pageRef.current?.id || targetId !== pageIdForUpdateRef.current) return;
  const livePage = getLatestPage?.(targetId) ?? pageRef.current;
  if (!livePage) return;
  const raw = contentModeRef.current === "raw";
  const content = raw ? toEditorBlocks(livePage.content) : normalizePageContent(livePage.content);
  const blocks = createEditorSafeContent(content, editor.schema);
  const current = clonePageContent(editor.document as BlockNoteContent);
  const currentSignature = getContentSignature(raw ? current : normalizePageContent(current));
  const nextSignature = getContentSignature(blocks);
  if (nextSignature === currentSignature) {
    syncedContentSignatureRef.current = currentSignature;
    return;
  }
  const scroller = editorContainerRef.current?.closest<HTMLElement>(".page-scroll-container");
  const scrollTop = scroller?.scrollTop;
  debouncedUpdate.cancel();
  pendingEditorChangeRef.current = false;
  try {
    markProgrammaticRead(editor);
    editor.transact((tr: Transaction) => replacePageContent(tr, blocks as any));
  } catch (error) {
    console.error("[goose-note] replace editor blocks failed during reload", { pageId: livePage.id, error });
    return;
  }
  const reloaded = clonePageContent(editor.document as BlockNoteContent);
  syncedContentSignatureRef.current = getContentSignature(raw ? reloaded : normalizePageContent(reloaded));
  userInteractedRef.current = false;
  if (scroller && typeof scrollTop === "number") scroller.scrollTop = scrollTop;
}
