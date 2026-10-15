import { useEffect } from "react";
import {
  completePageTitleFocus,
  subscribePageTitleFocus,
  isPageTitleFocusRequested,
} from "@/lib/page-title-focus";
import { useEditorPageTasks } from "./useEditorPageTasks";
import type { EditorRuntime } from "./useEditorSession";

export function useEditorHostFocus(
  runtime: EditorRuntime,
  focusEditorSafely: () => void,
  isActiveEditor: boolean,
) {
  const { editor, activePageId, pageRef, usesRawEditorContentRef } = runtime;
  const tasks = useEditorPageTasks(runtime, isActiveEditor);

  useEffect(() => {
    if (!isActiveEditor) return;
    const handleFocusStart = () => {
      const pageId = pageRef.current?.id;
      // Local-file titles belong to the host tab; keep its pending focus request.
      if (pageId && isPageTitleFocusRequested(pageId) && usesRawEditorContentRef.current) return;
      const focusTitleEnd = () => {
        const blocks = editor.document;
        if (blocks.length === 0) return false;
        try {
          editor.setTextCursorPosition(blocks[0], "end");
          editor.focus();
          if (pageId && isPageTitleFocusRequested(pageId)) completePageTitleFocus(pageId);
          return true;
        } catch {
          return false;
        }
      };
      if (!focusTitleEnd()) tasks.frame(() => {
        if (!focusTitleEnd()) focusEditorSafely();
      });
    };

    const focusBody = () => {
      const blocks = editor.document;
      if (blocks.length === 0) return false;
      const target = blocks[blocks.length - 1];
      try {
        if (!usesRawEditorContentRef.current && blocks.length === 1) {
          const [inserted] = editor.insertBlocks(
            [{ type: "paragraph", content: "" }], blocks[0], "after",
          );
          if (inserted) editor.setTextCursorPosition(inserted, "start");
        } else {
          try {
            editor.setTextCursorPosition(target, "end");
          } catch {
            const [inserted] = editor.insertBlocks(
              [{ type: "paragraph", content: "" }], target, "after",
            );
            if (!inserted) return false;
            editor.setTextCursorPosition(inserted, "start");
          }
        }
        editor.focus();
        return true;
      } catch {
        return false;
      }
    };
    const handleFocusBody = () => {
      if (!focusBody()) tasks.frame(focusBody);
    };

    let cancelCreatedPageFocus: (() => void) | undefined;
    const focusCreatedPage = () => {
      const pageId = pageRef.current?.id;
      if (!pageId || !isPageTitleFocusRequested(pageId)) return;
      cancelCreatedPageFocus?.();
      cancelCreatedPageFocus = tasks.frame(() => {
        if (!isPageTitleFocusRequested(pageId)) return;
        handleFocusBody();
        completePageTitleFocus(pageId);
      });
    };
    const handlePluginEnter = () => tasks.timeout(focusEditorSafely);
    const unsubscribeTitleFocus = subscribePageTitleFocus(focusCreatedPage);
    focusCreatedPage();
    window.addEventListener("goose-note:focus-editor-start", handleFocusStart);
    window.addEventListener("goose-note:focus-editor-body", handleFocusBody);
    window.addEventListener("goose-note:plugin-enter", handlePluginEnter);
    return () => {
      unsubscribeTitleFocus();
      cancelCreatedPageFocus?.();
      window.removeEventListener("goose-note:focus-editor-start", handleFocusStart);
      window.removeEventListener("goose-note:focus-editor-body", handleFocusBody);
      window.removeEventListener("goose-note:plugin-enter", handlePluginEnter);
    };
  }, [activePageId, editor, focusEditorSafely, isActiveEditor, pageRef, tasks, usesRawEditorContentRef]);
}
