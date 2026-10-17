import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/quick-note-app/useQuickNoteSaveActions.tsx#localMessages:1">`
zh-Hans:
  saveFailed: "未能保存到笔记"
  openNotebook: "请确认已打开笔记本后再试。"
  saved: "已保存到笔记"
  savedButNotOpened: "笔记已写入，主窗口暂时没能打开它。"
en:
  saveFailed: "Couldn’t save to notes"
  openNotebook: "Make sure a notebook is open, then try again."
  saved: "Saved to notes"
  savedButNotOpened: "The note was saved, but the main window could not open it."
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect } from "react";
import {
  useQuickNote,
  getActiveDraftContent,
  isQuickNoteDraftEmpty,
  type QuickNoteSlot,
} from "@/stores/useQuickNote";
import { toast } from "@/components/ui/sonner";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { quickNoteWindow } from "@/lib/electron/quickNoteWindow";
import type { useQuickNoteEditorActions } from "./useQuickNoteEditorActions";

async function revealSavedNoteWhenReady(filePath: string): Promise<boolean> {
  try {
    if (await quickNoteWindow.revealSavedNote(filePath)) return true;
    // 刚写完的文件，主进程偶发还看不到，短等一次再试。
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await quickNoteWindow.revealSavedNote(filePath);
  } catch (error) {
    console.warn("[quicknote] 打开主窗口失败", error);
    return false;
  }
}

export function useQuickNoteSaveActions(
  input: ReturnType<typeof useQuickNoteEditorActions>,
) {
  useLocale();
  const {
    editorRef,
    setWindowPosition,
    setPreviewSlot,
    savingToNote,
    setSavingToNote,
    flushEditor,
    applyHistoryContentToEditor,
  } = input;

  const handleSaveToNote = useCallback(async () => {
    if (savingToNote) return;
    flushEditor();
    if (isQuickNoteDraftEmpty(getActiveDraftContent(useQuickNote.getState()))) {
      return;
    }
    setSavingToNote(true);
    try {
      await useNotebooks.persist.rehydrate();
      const id = await useQuickNote.getState().saveDraftToNotebook();
      if (!id) {
        toast.error(uiText("saveFailed"), {
          description: uiText("openNotebook"),
        });
        return;
      }
      applyHistoryContentToEditor(null);
      const filePath = usePages.getState().pages[id]?.localFilePath;
      if (filePath && (await revealSavedNoteWhenReady(filePath))) return;
      toast.success(
        uiText("saved"),
        filePath ? { description: uiText("savedButNotOpened") } : undefined,
      );
    } finally {
      setSavingToNote(false);
    }
  }, [applyHistoryContentToEditor, flushEditor, savingToNote]);

  /** 拖动预览：只改显示槽，不写 activeSlot。 */
  const handlePreviewSlot = useCallback(
    (slot: QuickNoteSlot | null) => {
      flushEditor();
      setPreviewSlot(slot);
    },
    [flushEditor],
  );

  /** 关窗 / 收起前把当前位置写进 store + preload，保证下次 Electron 唤起仍在原处。 */
  const persistPlacementThenClose = useCallback(() => {
    flushEditor();
    const x = window.screenX;
    const y = window.screenY;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      setWindowPosition(x, y);
      quickNoteWindow.persistPosition(x, y);
    }
    quickNoteWindow.close();
  }, [flushEditor, setWindowPosition]);

  // 首帧：聚焦光标到编辑器。
  useEffect(() => {
    requestAnimationFrame(() => editorRef.current?.editor?.focus?.());
  }, []);

  // 复用窗口：父窗以「速记」再次唤起已存在的小窗时（preload 发 quicknote:enter），
  // 重新聚焦即可（草稿延续，不重解析笔记）。
  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => editorRef.current?.editor?.focus?.());
    };
    window.addEventListener("goose-note:quicknote-enter", handler);
    return () =>
      window.removeEventListener("goose-note:quicknote-enter", handler);
  }, []);
  return {
    ...input,
    handleSaveToNote,
    handlePreviewSlot,
    persistPlacementThenClose,
  };
}
