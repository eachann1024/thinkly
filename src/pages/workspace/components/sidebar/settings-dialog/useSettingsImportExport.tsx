import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/useSettingsImportExport.tsx#localMessages:1">`
zh-Hans:
  exportComplete_105c: "导出成功"
  exportFailed_dd51: "导出失败"
  pleaseTryAgainLater_d610: "请稍后重试。"
  noteBackup_fbdd: "笔记备份"
  importComplete_b6d1: "导入成功"
  notebooksRestored: "已恢复 {{notebooks}} 个笔记本，共 {{pages}} 个页面"
  importFailed_fddc: "导入失败"
  chooseAValidExportedZipBackup_0933: "请确保文件是有效的导出 ZIP 包"
en:
  exportComplete_105c: "Export complete"
  exportFailed_dd51: "Export failed"
  pleaseTryAgainLater_d610: "Please try again later."
  noteBackup_fbdd: "Note backup"
  importComplete_b6d1: "Import complete"
  notebooksRestored: "Restore complete. Notebooks: {{notebooks}}; pages: {{pages}}."
  importFailed_fddc: "Import failed"
  chooseAValidExportedZipBackup_0933: "Choose a valid exported ZIP backup"
ja:
  exportComplete_105c: "エクスポートが完了しました"
  exportFailed_dd51: "エクスポートに失敗しました"
  pleaseTryAgainLater_d610: "しばらくしてからもう一度お試しください。"
  noteBackup_fbdd: "ノートのバックアップ"
  importComplete_b6d1: "インポートが完了しました"
  notebooksRestored: "ノートブック {{notebooks}} 冊、ページ {{pages}} 件を復元しました"
  importFailed_fddc: "インポートに失敗しました"
  chooseAValidExportedZipBackup_0933: "有効なエクスポート済み ZIP バックアップを選択してください"
`;
const uiText = createTranslator(localMessages);
import { useEffect } from "react";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { pickImportFile } from "@/lib/export/documentFileDialogs";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import { toast } from "@/components/ui/sonner";
import { recordPreOverwriteHistory } from "./shared";
import type { useSettingsDialogState } from "./useSettingsDialogState";

export function useSettingsImportExport(
  input: ReturnType<typeof useSettingsDialogState>,
) {
  useLocale();
  const {
    open,
    notebooks,
    pages,
    selectedIds,
    format,
    sendDataEvent,
    beginDataOperation,
    resetDialogOpen,
    setResetInput,
    createNotebook,
  } = input;

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    const id = beginDataOperation("export");
    if (id === null) return;
    try {
      const { exportNotebooks } = await import("@/lib/export");
      const saved = await exportNotebooks(
        {
          format,
          notebookIds: selectedIds,
        },
        notebooks,
        Object.values(pages),
      );
      if (saved) toast.success(uiText("exportComplete_105c"));
    } catch (err) {
      console.error("Export failed", err);
      toast.error(uiText("exportFailed_dd51"), {
        description: err instanceof Error ? err.message : uiText("pleaseTryAgainLater_d610"),
      });
    } finally {
      sendDataEvent({ type: "export.finished", id });
    }
  };

  const handleImport = async () => {
    const id = beginDataOperation("import");
    if (id === null) return;
    try {
      const file = await pickImportFile([
        { name: uiText("noteBackup_fbdd"), extensions: ["zip", "mdzip"] },
      ]);
      if (!file) return;
      sendDataEvent({ type: "import.fileChosen", id });

      let firstWorkspaceId: string | null = null;
      let firstPageId: string | null = null;
      let notebookCount = 0;
      let pageCount = 0;

      const { importNotebooksFromZip } = await import("@/lib/export");
      await importNotebooksFromZip(
        file,
        (name, icon, id) => {
          notebookCount++;
          const newId = createNotebook(name, icon || "BookOpen", true, id);
          if (!firstWorkspaceId) firstWorkspaceId = newId;
          return newId;
        },
        async (data, workspaceId, parentId, id) => {
          pageCount++;
          await recordPreOverwriteHistory(id);
          const pageId = usePages.getState().createPageRecord({
            ...data,
            id,
            workspaceId,
            parentId,
          });
          if (!firstPageId) firstPageId = pageId;
          return pageId;
        },
      );

      const { setActiveNotebook } = useNotebooks.getState();
      const { setActivePage } = usePages.getState();

      if (firstWorkspaceId) setActiveNotebook(firstWorkspaceId);
      if (firstPageId) {
        closeNotebookAiIfFullscreen();
        setActivePage(firstPageId);
      }

      toast.success(uiText("importComplete_b6d1"), {
        description: uiText("notebooksRestored", { notebooks: notebookCount, pages: pageCount }),
      });
    } catch (err) {
      console.error("Import failed", err);
      toast.error(uiText("importFailed_fddc"), {
        description: err instanceof Error ? err.message : uiText("chooseAValidExportedZipBackup_0933"),
      });
    } finally {
      sendDataEvent({ type: "import.finished", id });
    }
  };

  useEffect(() => {
    if (!open) sendDataEvent({ type: "settings.closed" });
    if (!open || !resetDialogOpen) {
      setResetInput("");
    }
  }, [open, resetDialogOpen, sendDataEvent, setResetInput]);
  return { ...input, handleExport, handleImport };
}
