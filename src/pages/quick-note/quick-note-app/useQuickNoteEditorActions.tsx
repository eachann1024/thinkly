import { useCallback, useMemo } from "react";
import {
  useQuickNote,
  buildQuickNoteDraftPage,
  type QuickNoteSlot,
} from "@/stores/useQuickNote";
import type { BlockNoteContent } from "@/components/editor/utils/blocknote-content";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { useQuickNoteRename } from "./useQuickNoteRename";
import type { useQuickNoteDraftState } from "./useQuickNoteDraftState";

export function useQuickNoteEditorActions(
  input: ReturnType<typeof useQuickNoteDraftState>,
) {
  const {
    editorRef,
    restoredContentSignatureRef,
    setActiveSlot,
    setDraftContent,
    undoDraft,
    redoDraft,
    setHistoryEpoch,
    setPreviewSlot,
    setHelpOpen,
    displaySlot,
  } = input;

  // 草稿内容变更：写入「当前显示的槽位」（正式 active 或 scrub 预览）。
  // 用 displaySlot 闭包锁定槽号，避免切换后旧实例尾随 onChange 串写。
  const onDraftChange = useMemo(() => {
    const boundSlot = displaySlot;
    return (content: BlockNoteContent) => {
      const signature = getContentSignature(content);
      const restored = restoredContentSignatureRef.current;
      const isRestoreSync =
        restored?.slot === boundSlot && signature === restored.signature;
      if (restored?.slot === boundSlot) {
        restoredContentSignatureRef.current = null;
      }
      setDraftContent(content as never, boundSlot, {
        recordHistory: !isRestoreSync,
      });
    };
  }, [displaySlot, setDraftContent]);

  const flushEditor = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("goose-note:flush-editor", {
        detail: { immediate: true },
      }),
    );
  }, []);

  const rename = useQuickNoteRename(input, flushEditor);

  const applyHistoryContentToEditor = useCallback(
    (content: BlockNoteContent | null) => {
      restoredContentSignatureRef.current = {
        slot: useQuickNote.getState().activeSlot,
        signature: getContentSignature(
          buildQuickNoteDraftPage(content as never).content,
        ),
      };
      setHistoryEpoch((n) => n + 1);
      requestAnimationFrame(() => {
        editorRef.current?.editor?.focus?.();
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    flushEditor();
    const result = undoDraft();
    if (!result.applied) return false;
    applyHistoryContentToEditor(result.content as BlockNoteContent | null);
    return true;
  }, [applyHistoryContentToEditor, flushEditor, undoDraft]);

  const handleRedo = useCallback(() => {
    flushEditor();
    const result = redoDraft();
    if (!result.applied) return false;
    applyHistoryContentToEditor(result.content as BlockNoteContent | null);
    return true;
  }, [applyHistoryContentToEditor, flushEditor, redoDraft]);

  const handleSwitchSlot = useCallback(
    (
      slot: QuickNoteSlot,
      source: "pointer" | "shortcut" | "switcher-keyboard",
    ) => {
      flushEditor();
      setPreviewSlot(null);
      if (slot === useQuickNote.getState().activeSlot) return;
      setActiveSlot(slot);
      if (source !== "switcher-keyboard") {
        requestAnimationFrame(() => {
          editorRef.current?.editor?.focus?.();
        });
      }
    },
    [flushEditor, setActiveSlot],
  );

  const handleHelpOpenChange = useCallback((open: boolean) => {
    setHelpOpen(open);
  }, []);
  return {
    ...input,
    onDraftChange,
    flushEditor,
    ...rename,
    applyHistoryContentToEditor,
    handleUndo,
    handleRedo,
    handleSwitchSlot,
    handleHelpOpenChange,
  };
}
