import { useEffect } from "react";
import { getSelectedImageUrl } from "@/components/editor/utils/selection";
import { copyImageSrcToClipboard } from "@/components/editor/image/imageUtils";
import { snapshotEditorSelection, restoreEditorSelection } from "../utils/editorSelectionSnapshot";
import { deleteCutSelection } from "../extensions/copyBlockClipboard";
import { toast } from "@/components/ui/sonner";
import {
  reconcileSlashSuggestionMenu,
  reconcilePageMentionSuggestionMenu,
} from "@/components/editor/utils/slashMenuPolicy";
import type { EditorRuntime } from "./useEditorSession";

export function useEditorClipboard(runtime: EditorRuntime) {
  const {
    editor,
    editorContainerRef,
    platformRef,
    getActivePageLocalFilePathRef,
    usesRawEditorContentRef,
  } = runtime;
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const copyImage = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      const view = editor.prosemirrorView;
      if (!(event.target instanceof Node) || !view.dom.contains(event.target)) return;
      const image = getSelectedImageUrl(view.state);
      if (!image) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const snapshot = snapshotEditorSelection(view.state);
      void (async () => {
        try {
          await copyImageSrcToClipboard(
            image, platformRef.current, getActivePageLocalFilePathRef.current(),
          );
          if (event.type !== "cut" || !view.editable) return;
          if (!restoreEditorSelection(view, snapshot)) {
            toast.error("图片已复制；笔记内容已变化，原图片已保留");
            return;
          }
          deleteCutSelection(view);
        } catch (error) {
          console.error("[editor] Failed to copy selected image", error);
          toast.error("无法写入图片剪贴板，原图片已保留");
        }
      })();
    };
    // 先于 BlockNote 原生 cut handler，防止其在异步位图写入前删除图片。
    container.addEventListener("copy", copyImage, true);
    container.addEventListener("cut", copyImage, true);
    return () => {
      container.removeEventListener("copy", copyImage, true);
      container.removeEventListener("cut", copyImage, true);
    };
  }, [editor]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onCompositionEnd = () =>
      queueMicrotask(() => {
        reconcileSlashSuggestionMenu(editor, {
          allowSlashMenuOnFirstBlock: usesRawEditorContentRef.current,
        });
        reconcilePageMentionSuggestionMenu(editor);
      });
    container.addEventListener("compositionend", onCompositionEnd);
    return () =>
      container.removeEventListener("compositionend", onCompositionEnd);
  }, [editor]);
}
