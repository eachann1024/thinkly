import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/quick-note/quick-note-app/useQuickNoteSaveActions.tsx#localMessages:1">`
zh-Hans:
  saveFailed: "未能保存到笔记"
  openNotebook: "请确认已打开笔记本后再试。"
  saved: "已保存到笔记"
  savedButNotOpened: "笔记已写入，主窗口暂时没能打开它。"
  openMainWindow: "打开主窗口"
  openSavedNote: "打开笔记"
en:
  saveFailed: "Couldn’t save to notes"
  openNotebook: "Make sure a notebook is open, then try again."
  saved: "Saved to notes"
  savedButNotOpened: "The note was saved, but the main window could not open it."
  openMainWindow: "Open main window"
  openSavedNote: "Open note"
ja:
  saveFailed: "ノートに保存できませんでした"
  openNotebook: "ノートブックが開いていることを確認してから、もう一度お試しください。"
  saved: "ノートに保存しました"
  savedButNotOpened: "ノートは書き込まれましたが、メインウィンドウで開けませんでした。"
  openMainWindow: "メインウィンドウを開く"
  openSavedNote: "ノートを開く"
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
import { showSaveRecoveryNotice } from "@/lib/save-recovery-notice";
import { DEFAULT_NOTEBOOK, useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { quickNoteWindow } from "@/lib/electron/quickNoteWindow";
import type { useQuickNoteEditorActions } from "./useQuickNoteEditorActions";
import { routeQuickNoteSaveFailure } from "./quickNoteSaveFailure";

async function revealSavedNoteWhenReady(filePath: string): Promise<boolean> {
  try {
    if (await quickNoteWindow.revealSavedNote(filePath)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await quickNoteWindow.revealSavedNote(filePath);
  } catch (error) {
    console.warn("[quicknote] 打开主窗口失败", error);
    return false;
  }
}

function showOpenMainWindowFailure(description: string): void {
  showSaveRecoveryNotice({
    id: "quicknote-open-main-window-failed",
    title: uiText("saveFailed"),
    description,
    retryLabel: uiText("openMainWindow"),
    onRetry: async () => {
      if (!(await quickNoteWindow.showMainWindow())) {
        throw new Error(uiText("openNotebook"));
      }
    },
    onRetryFailure: (error) => error instanceof Error ? error.message : String(error),
  });
}

function showSavedNoteOpenFailure(noteId: string, filePath: string): void {
  showSaveRecoveryNotice({
    id: `quicknote-saved-but-not-opened:${noteId}`,
    title: uiText("saved"),
    description: uiText("savedButNotOpened"),
    retryLabel: uiText("openSavedNote"),
    onRetry: async () => {
      if (!(await revealSavedNoteWhenReady(filePath))) {
        throw new Error(uiText("savedButNotOpened"));
      }
    },
    onRetryFailure: (error) => error instanceof Error ? error.message : String(error),
  });
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
      const saved = await useQuickNote.getState().saveDraftToNotebook();
      if (!saved) {
        const notebookState = useNotebooks.getState();
        const notebookId = notebookState.activeNotebookId ?? DEFAULT_NOTEBOOK;
        const notebook = notebookState.notebooks[notebookId];
        routeQuickNoteSaveFailure({
          notebookAvailable: Boolean(notebook),
          localRecoveryAvailable: Boolean(
            notebook?.source === "local-folder" && notebook.localPath && window.gooseFs,
          ),
          openNotebook: () => showOpenMainWindowFailure(uiText("openNotebook")),
          showSaveError: () => toast.error(uiText("saveFailed")),
        });
        return;
      }
      const current = useQuickNote.getState();
      if (
        saved.clearedSlot !== null &&
        current.activeSlot === saved.clearedSlot &&
        current.drafts[saved.clearedSlot] === null
      ) {
        applyHistoryContentToEditor(null);
      }
      const filePath = usePages.getState().pages[saved.id]?.localFilePath;
      if (filePath && (await revealSavedNoteWhenReady(filePath))) return;
      if (filePath) {
        showSavedNoteOpenFailure(saved.id, filePath);
      } else {
        toast.success(uiText("saved"));
      }
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : uiText("saveFailed"),
      );
    } finally {
      setSavingToNote(false);
    }
  }, [applyHistoryContentToEditor, flushEditor, savingToNote]);

  const handlePreviewSlot = useCallback(
    (slot: QuickNoteSlot | null) => {
      flushEditor();
      setPreviewSlot(slot);
    },
    [flushEditor],
  );

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

  useEffect(() => {
    requestAnimationFrame(() => editorRef.current?.editor?.focus?.());
  }, []);

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
