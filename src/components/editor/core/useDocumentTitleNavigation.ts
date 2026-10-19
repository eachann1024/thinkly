import { useEffect } from "react";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { completePageTitleFocus, hasDocumentTitle } from "@/lib/page-title-focus";
import { ENTER_DOCUMENT_BODY_EVENT, saveDocumentTitle, isPlainDocumentNavigation, type DocumentTitleSplit } from "@/lib/document-title-keyboard";
import { createDocumentTitleHistoryPlugin } from "./documentTitleHistory";
import { markUserInteraction } from "@/lib/editor-interaction-signal";
import {
  canReturnToDocumentTitle,
  enterFirstBodyParagraph,
  focusFirstBodyBlock,
  mergeFirstBodyParagraph,
  mergedFirstBodyTitle,
  shouldBackspaceToDocumentTitle,
} from "./documentTitleNavigation";
import type { EditorRuntime } from "./useEditorSession";

/** 标题与编辑器只通过各自的文档容器通信，同页双开也不会互相抢焦点。 */
export function useDocumentTitleNavigation(runtime: EditorRuntime, editable: boolean) {
  const { editor, activePageId, pageRef, editorContainerRef, userInteractedRef, contentModeRef } = runtime;
  useEffect(() => {
    const container = editorContainerRef.current;
    const scope = container?.closest(".page-layout-document");
    if (!container || !scope) return;
    const title = scope.querySelector<HTMLTextAreaElement>("textarea.page-document-title");
    if (!title) return;
    const historyPlugin = createDocumentTitleHistoryPlugin(title);
    editor._tiptapEditor.registerPlugin(historyPlugin);
    const canNavigate = () => {
      const page = pageRef.current;
      return editable && editor.isEditable && !editor._tiptapEditor.isDestroyed &&
        container.isConnected && contentModeRef.current === "raw" &&
        hasDocumentTitle(page) && !page?.isLocked && !page?.trashedAt &&
        page?.localReadState !== "error" && !title.readOnly;
    };
    const enterBody = (event: Event) => {
      const split = (event as CustomEvent<DocumentTitleSplit>).detail;
      const pageId = split?.pageId;
      if (event.target !== title || document.activeElement !== title ||
        pageId !== pageRef.current?.id || !canNavigate()) return;
      // 在插入事务之前标记，确保 raw 文档走正常保存；focus 引发的标题 blur
      // 发生在插入之后，草稿首次命名的 flush 也能拿到完整正文。
      userInteractedRef.current = true;
      markUserInteraction();
      if (enterFirstBodyParagraph(editor, split)) {
        completePageTitleFocus(pageId!);
        editor.focus();
      }
    };
    let focusFrame: number | undefined;
    const placeTitleCursor = (offset: number) => {
      title.focus();
      title.setSelectionRange(offset, offset);
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
      // React 提交新的 textarea value 后，再固定到拼接点。
      focusFrame = requestAnimationFrame(() => {
        if (document.activeElement === title) title.setSelectionRange(offset, offset);
      });
    };
    let mergedFromTitle = false;
    const resetTitleHistory = () => { mergedFromTitle = false; };
    const titleKeyDown = (event: KeyboardEvent) => {
      if (!canNavigate() || event.isComposing || event.keyCode === 229) return;
      if (mergedFromTitle && (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) editor.redo(); else editor.undo();
        return;
      }
      if (!isPlainDocumentNavigation(event) || title.selectionStart !== title.selectionEnd ||
        title.selectionEnd !== title.value.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        if (!focusFirstBodyBlock(editor)) return;
      } else return;
      event.preventDefault();
      event.stopPropagation();
    };
    let mergePending = false;
    const returnToTitle = async (event: KeyboardEvent) => {
      const backspace = event.key === "Backspace";
      if ((event.key !== "ArrowUp" && event.key !== "ArrowLeft" && !backspace) || !isPlainDocumentNavigation(event) ||
        !canNavigate() || editor.prosemirrorView.composing || !editor.isFocused()) return;
      const target = event.target;
      if (!(target instanceof Node) || !editor.domElement?.contains(target)) return;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='false']")) return;
      if (editor.getExtension(SuggestionMenu)?.shown()) return;
      // 上方向键沿用首块文字起点。退格只在空正文或首段文字起点回到标题，
      // 避免吃掉正文中间删除、空段合并，以及列表和标题自己的退格。
      if (!(backspace ? shouldBackspaceToDocumentTitle(editor) : canReturnToDocumentTitle(editor))) return;
      event.preventDefault();
      event.stopPropagation();
      const end = title.value.length;
      if (backspace) {
        userInteractedRef.current = true;
        markUserInteraction();
        if (mergePending) return;
        const before = title.value;
        const after = mergedFirstBodyTitle(editor, before);
        if (after === null) return;
        const documentBefore = editor.prosemirrorState.doc;
        const selectionBefore = editor.prosemirrorState.selection;
        mergePending = true;
        const saved = after === before || await saveDocumentTitle(title, activePageId, after);
        mergePending = false;
        // 保存期间若切页或继续编辑正文，保留原段，不能移除新的内容。
        if (!saved || !canNavigate() || pageRef.current?.id !== activePageId ||
          !editor.isFocused() || !editor.prosemirrorState.selection.eq(selectionBefore) ||
          !editor.prosemirrorState.doc.eq(documentBefore)) return;
        if (!mergeFirstBodyParagraph(editor, activePageId, before)) return;
        mergedFromTitle = true;
      }
      placeTitleCursor(end);
    };
    title.addEventListener("keydown", titleKeyDown);
    title.addEventListener("input", resetTitleHistory);
    scope.addEventListener(ENTER_DOCUMENT_BODY_EVENT, enterBody);
    container.addEventListener("keydown", returnToTitle, true);
    return () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
      title.removeEventListener("keydown", titleKeyDown);
      title.removeEventListener("input", resetTitleHistory);
      scope.removeEventListener(ENTER_DOCUMENT_BODY_EVENT, enterBody);
      container.removeEventListener("keydown", returnToTitle, true);
      if (!editor._tiptapEditor.isDestroyed) editor._tiptapEditor.unregisterPlugin(historyPlugin.spec.key!);
    };
  }, [activePageId, contentModeRef, editable, editor, editorContainerRef, pageRef, userInteractedRef]);
}
