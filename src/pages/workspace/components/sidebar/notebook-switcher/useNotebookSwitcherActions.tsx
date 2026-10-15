import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { activateWorkspace } from "@/lib/settings-navigation";
import { activateNotebook } from "@/lib/notebookNavigation";
import { dialogs } from "@/lib/electron-platform/dialogs";
import type { useNotebookSwitcherState } from "./useNotebookSwitcherState";

export function useNotebookSwitcherActions(
  input: ReturnType<typeof useNotebookSwitcherState>,
) {
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

  const handleOpenLocalFolder = async () => {
    try {
      const path = await dialogs.selectDirectory();
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
    if (!editDialog.id) return;
    updateNotebook(editDialog.id, {
      name: editDialog.name,
      icon: editDialog.icon,
      excludeFromGlobalSearch: editDialog.excludeFromGlobalSearch,
    });
    setEditDialog({ ...editDialog, open: false });
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
