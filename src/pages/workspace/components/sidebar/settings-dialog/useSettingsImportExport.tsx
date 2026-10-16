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
      if (saved) toast.success("导出成功");
    } catch (err) {
      console.error("Export failed", err);
      toast.error("导出失败", {
        description: err instanceof Error ? err.message : "请稍后重试。",
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
        { name: "笔记备份", extensions: ["zip", "mdzip"] },
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

      toast.success("导入成功", {
        description: `已恢复 ${notebookCount} 个笔记本，共 ${pageCount} 个页面`,
      });
    } catch (err) {
      console.error("Import failed", err);
      toast.error("导入失败", {
        description: err instanceof Error ? err.message : "请确保文件是有效的导出 ZIP 包",
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
