import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/notebook-switcher/useNotebookSwitcherActions.tsx#localMessages:1">`
zh-Hans:
  enterANotebookName_648e: "请输入笔记本名称"
  renameFailed_37ba: "重命名失败"
  pickerUnavailable: "无法打开文件夹选择器"
en:
  enterANotebookName_648e: "Enter a notebook name"
  renameFailed_37ba: "Rename failed"
  pickerUnavailable: "The folder picker is unavailable"
`;
const uiText = createTranslator(localMessages);
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "@/components/ui/sonner";
import { activateWorkspace } from "@/lib/settings-navigation";
import { activateNotebook } from "@/lib/notebookNavigation";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { renameLocalNotebookFolder } from "@/lib/rename-notebook-folder";
import type { useNotebookSwitcherState } from "./useNotebookSwitcherState";

export function useNotebookSwitcherActions(
  input: ReturnType<typeof useNotebookSwitcherState>,
) {
  useLocale();
  const {
    notebooks,
    createLocalFolderNotebook,
    updateNotebook,
    deleteNotebook,
    reorderNotebooks,
    setIsOpen,
    isDraggingRef,
    editDialog,
    setEditDialog,
    notebookList,
  } = input;
  const savingRef = useRef(false);

  const handleOpenLocalFolder = async () => {
    const desktop = getGooseDesktop();
    if (!desktop) {
      toast.error(uiText("pickerUnavailable"));
      setIsOpen(false);
      return;
    }
    try {
      const path = await desktop.selectDirectory({ purpose: "notebook" });
      if (path) {
        activateWorkspace();
        const folderName = path.split(/[\\/]/).pop() || "Unknown";
        const notebookId = createLocalFolderNotebook(folderName, path);
        await usePages.getState().loadLocalFolderPages(notebookId, path, {
          showWelcome: true,
        });
        void activateNotebook(notebookId);
      }
    } catch (e) {
      console.error(e);
      toast.error(uiText("pickerUnavailable"));
    } finally {
      setIsOpen(false);
    }
  };

  const handleEdit = (id: string) => {
    const notebook = notebooks[id];
    if (!notebook) return;

    setEditDialog({
      open: true,
      id,
      name: notebook.name,
      confirmName: notebook.name,
      icon:
        notebook.icon ||
        (notebook.source === "local-folder" ? "FolderOpen" : "BookOpen"),
      excludeFromGlobalSearch: Boolean(notebook.excludeFromGlobalSearch),
      openDeleteConfirm: false,
      isLocalFolder: notebook.source === "local-folder",
    });
    setIsOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editDialog.id || savingRef.current) return;
    const name = editDialog.name.trim();
    if (!name) {
      toast.error(uiText("enterANotebookName_648e"));
      return;
    }
    const notebook = notebooks[editDialog.id];
    const updates = {
      name,
      icon: editDialog.icon,
      excludeFromGlobalSearch: editDialog.excludeFromGlobalSearch,
    };
    const close = () => setEditDialog({ ...editDialog, open: false });
    if (notebook?.source === "local-folder" && notebook.localPath && name !== notebook.name) {
      savingRef.current = true;
      void renameLocalNotebookFolder(editDialog.id, name, updates)
        .then(close)
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : uiText("renameFailed_37ba"));
        })
        .finally(() => {
          savingRef.current = false;
        });
      return;
    }
    updateNotebook(editDialog.id, updates);
    close();
  };

  const handleDelete = () => {
    if (!editDialog.id) return;
    deleteNotebook(editDialog.id);
    setEditDialog({ ...editDialog, open: false });
  };

  const handleDragStart = () => {
    isDraggingRef.current = true;
    setIsOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = notebookList.findIndex((nb) => nb.id === active.id);
    const newIndex = notebookList.findIndex((nb) => nb.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(notebookList, oldIndex, newIndex);
    reorderNotebooks(next.map((nb) => nb.id));
  };

  const handleDragCancel = () => {
    isDraggingRef.current = false;
  };
  return {
    ...input,
    handleOpenLocalFolder,
    handleEdit,
    handleSaveEdit,
    handleDelete,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
