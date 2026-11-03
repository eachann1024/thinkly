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
ja:
  enterANotebookName_648e: "ノートブック名を入力してください"
  renameFailed_37ba: "名前を変更できませんでした"
  pickerUnavailable: "フォルダ選択ダイアログを開けません"
`;
const uiText = createTranslator(localMessages);
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "@/components/ui/sonner";
import { activateWorkspace } from "@/lib/settings-navigation";
import { activateNotebook } from "@/lib/notebookNavigation";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { renameLocalNotebookFolder } from "@/lib/rename-notebook-folder";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { readNotebookEditValues } from "@/windows/views/notebookEditPayload";
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
    savingRef,
    notebookList,
  } = input;

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
    const open = window.gooseDesktop?.auxiliary?.open;
    if (!notebook || !open || savingRef.current) return;
    setIsOpen(false);
    const pageCount = Object.values(usePages.getState().pages).filter(
      (page) => page.workspaceId === id && !page.trashedAt && !page.isFolder,
    ).length;
    void open({
      kind: "notebook-edit",
      payload: {
        id,
        name: notebook.name,
        icon: notebook.icon || (notebook.source === "local-folder" ? "FolderOpen" : "BookOpen"),
        excludeFromGlobalSearch: Boolean(notebook.excludeFromGlobalSearch),
        isLocalFolder: notebook.source === "local-folder",
        pageCount,
      },
    }).then((response) => {
      if (response.status !== "confirmed") return;
      const values = readNotebookEditValues(response.values);
      const current = useNotebooks.getState().notebooks[id];
      if (!values || !current || savingRef.current) return;
      if (values.action !== "save") {
        deleteNotebook(id);
        return;
      }
      const name = values.name.trim();
      if (!name) {
        toast.error(uiText("enterANotebookName_648e"));
        return;
      }
      const updates = {
        name,
        icon: values.icon,
        excludeFromGlobalSearch: values.excludeFromGlobalSearch,
      };
      if (current.source === "local-folder" && current.localPath && name !== current.name) {
        savingRef.current = true;
        void renameLocalNotebookFolder(id, name, updates)
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : uiText("renameFailed_37ba"));
          })
          .finally(() => {
            savingRef.current = false;
          });
        return;
      }
      updateNotebook(id, updates);
    }).catch(() => undefined);
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
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
