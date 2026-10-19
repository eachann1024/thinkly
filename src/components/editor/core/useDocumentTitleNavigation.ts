import { useEffect } from "react";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { completePageTitleFocus, hasDocumentTitle } from "@/lib/page-title-focus";
import { ENTER_DOCUMENT_BODY_EVENT, isPlainDocumentNavigation, type DocumentTitleSplit } from "@/lib/document-title-keyboard";
import { createDocumentTitleHistoryPlugin } from "./documentTitleHistory";
import { markUserInteraction } from "@/lib/editor-interaction-signal";
import {
  canReturnToDocumentTitle,
  enterFirstBodyParagraph,
  removeEmptyFirstBodyParagraph,
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
    const returnToTitle = (event: KeyboardEvent) => {
      const backspace = event.key === "Backspace";
      if ((event.key !== "ArrowUp" && !backspace) || !isPlainDocumentNavigation(event) ||
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
      // 空的正文首段连同这行空行一起收掉，光标直接落到标题末尾。
      if (backspace) removeEmptyFirstBodyParagraph(editor);
      title.focus();
      const end = title.value.length;
      title.setSelectionRange(end, end);
    };
    scope.addEventListener(ENTER_DOCUMENT_BODY_EVENT, enterBody);
    container.addEventListener("keydown", returnToTitle, true);
    return () => {
      scope.removeEventListener(ENTER_DOCUMENT_BODY_EVENT, enterBody);
      container.removeEventListener("keydown", returnToTitle, true);
      if (!editor._tiptapEditor.isDestroyed) editor._tiptapEditor.unregisterPlugin(historyPlugin.spec.key!);
    };
  }, [activePageId, contentModeRef, editable, editor, editorContainerRef, pageRef, userInteractedRef]);
}
