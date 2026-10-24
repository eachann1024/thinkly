import { useCallback, useEffect } from "react";
import { needsBodyParagraphAfterTitle } from "@/components/editor/utils/blocknote-content";
import { armBottomBlankSelectionDrag } from "@/components/editor/extensions/trailingBlankDrag";
import { isBottomEditorBlankClick } from "@/components/editor/utils/selection";
import { useEditorPageTasks } from "./useEditorPageTasks";
import type { EditorRuntime } from "./useEditorSession";

export function useEditorFocus(
  runtime: EditorRuntime,
  editable: boolean,
  isActiveEditor: boolean,
) {
  const {
    editor,
    usesRawEditorContentRef,
    editorContainerRef,
    suppressFormattingToolbarRef,
    setSuppressFormattingToolbar,
  } = runtime;
  const tasks = useEditorPageTasks(runtime, isActiveEditor);
  const focusEditorSafely = useCallback(() => {
    const tryFocus = () => {
      if (editor._tiptapEditor.isDestroyed) return false;
      const view = editor.prosemirrorView;
      const dom = view?.dom as HTMLElement | undefined;
      if (view && dom && dom.isConnected && view.state.doc.content.size > 0) {
        editor.focus();
        return true;
      }
      return false;
    };
    if (!tryFocus()) {
      tasks.frame(() => {
        tryFocus();
      });
    }
  }, [editor, tasks]);

  const focusEditorEnd = useCallback(() => {
    if (
      !usesRawEditorContentRef.current &&
      needsBodyParagraphAfterTitle(editor.document)
    ) {
      const titleBlock = editor.document[0];
      if (titleBlock) {
        const [inserted] = editor.insertBlocks(
          [{ type: "paragraph", content: [] }],
          titleBlock,
          "after",
        );
        if (inserted) {
          editor.setTextCursorPosition(inserted, "start");
          focusEditorSafely();
          return;
        }
      }
    }

    const lastBlock = editor.document.at(-1);
    if (lastBlock) {
      const blockSpecs = editor.schema.blockSpecs as
        | Record<string, { config?: { content?: string } }>
        | undefined;
      const contentType = blockSpecs?.[lastBlock.type]?.config?.content;
      if (
        contentType === "none" ||
        contentType === "table" ||
        lastBlock.type === "codeBlock"
      ) {
        const [inserted] = editor.insertBlocks(
          [{ type: "paragraph", content: [] }],
          lastBlock,
          "after",
        );
        if (inserted) {
          editor.setTextCursorPosition(inserted, "start");
        }
      } else {
        editor.setTextCursorPosition(lastBlock, "end");
      }
    }
    focusEditorSafely();
  }, [editor, focusEditorSafely, usesRawEditorContentRef]);

  const beginBottomBlankSelection = useCallback(
    (event: MouseEvent) => {
      suppressFormattingToolbarRef.current = true;
      setSuppressFormattingToolbar(true);
      event.preventDefault();
      focusEditorEnd();
      const view = editor.prosemirrorView;
      if (!view || view.isDestroyed) return;
      armBottomBlankSelectionDrag(view, event, view.state.selection.head);
    },
    [editor, focusEditorEnd, setSuppressFormattingToolbar, suppressFormattingToolbarRef],
  );

  const handleEditorBlankMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editable || event.button !== 0) return;
      const container = editorContainerRef.current;
      if (!container || !isBottomEditorBlankClick(event, container)) return;
      beginBottomBlankSelection(event.nativeEvent);
    },
    [beginBottomBlankSelection, editable, editorContainerRef],
  );

  useEffect(() => {
    if (!editable) return;

    const handleDocMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const container = editorContainerRef.current;
      if (!container) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (container.contains(target)) return;
      const scrollContainer = target.closest(".page-scroll-container");
      if (!scrollContainer) return;
      if (!scrollContainer.contains(container)) return;

      const blocks = container.querySelectorAll<HTMLElement>(".bn-block-outer");
      const lastBlock = blocks[blocks.length - 1];
      if (!lastBlock) return;
      if (event.clientY < lastBlock.getBoundingClientRect().bottom) return;

      beginBottomBlankSelection(event);
    };

    document.addEventListener("mousedown", handleDocMouseDown, true);
    return () => {
      document.removeEventListener("mousedown", handleDocMouseDown, true);
    };
  }, [beginBottomBlankSelection, editable, editorContainerRef]);

  useEffect(() => {
    const clearSuppress = () => {
      if (!suppressFormattingToolbarRef.current) return;
      suppressFormattingToolbarRef.current = false;
      setSuppressFormattingToolbar(false);
    };
    document.addEventListener("mouseup", clearSuppress, true);
    window.addEventListener("blur", clearSuppress);
    return () => {
      document.removeEventListener("mouseup", clearSuppress, true);
      window.removeEventListener("blur", clearSuppress);
    };
  }, [setSuppressFormattingToolbar, suppressFormattingToolbarRef]);

  return { focusEditorSafely, handleEditorBlankMouseDown };
}
