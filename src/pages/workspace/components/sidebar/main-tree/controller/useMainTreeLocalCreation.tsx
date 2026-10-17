import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/controller/useMainTreeLocalCreation.tsx#localMessages:1">`
zh-Hans:
  newFolder_f3a4: "新建文件夹"
  theDestinationFolderNoLongerExists_0e13: "目标文件夹已不存在，请重新选择位置"
  couldNotCreateItemTheName_2735: "创建失败：名称已存在或无写入权限，请修改后重试"
  folderCreated_1541: "已新建文件夹"
en:
  newFolder_f3a4: "New folder"
  theDestinationFolderNoLongerExists_0e13: "The destination folder no longer exists. Choose another location."
  couldNotCreateItemTheName_2735: "Could not create item: the name exists or the folder is not writable. Change the name or check permissions, then try again."
  folderCreated_1541: "Folder created"
`;
const uiText = createTranslator(localMessages);
import { createNamedPage } from "@/lib/create-named-page";
import { useNotebooks } from "@/stores/useNotebooks";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import { PENDING_CREATE_ID_PREFIX } from "./shared";
import type { useMainTreeState } from "./useMainTreeState";

export function useMainTreeLocalCreation(
  input: ReturnType<typeof useMainTreeState>,
) {
  useLocale();
  const {
    activeNotebookId,
    pages,
    createLocalFolderRecord,
    setExpandPageId,
    pendingCreate,
    setPendingCreate,
    setDraggingItemId,
    draggingItemIdRef,
    setPendingTreeSelection,
    isLocalFolder,
    expandedIds,
    expandView,
    setSelectedView,
    highlightedPageId,
  } = input;
  const committingRef = useRef(false);

  useEffect(() => {
    setPendingCreate((current) => current && current.workspaceId !== activeNotebookId ? null : current);
  }, [activeNotebookId, setPendingCreate]);

  const startCreateLocalFolder = useCallback(
    (parentId?: string) => {
      if (!activeNotebookId || !isLocalFolder) return;
      if (committingRef.current) return;
      const parentPage = parentId ? pages[parentId] : undefined;
      const safeParentId = parentPage?.isFolder ? parentId : undefined;
      const pendingId = `${PENDING_CREATE_ID_PREFIX}folder-${crypto.randomUUID()}`;
      const now = Date.now();
      const defaultTitle = uiText("newFolder_f3a4");
      setPendingCreate({
        id: pendingId,
        workspaceId: activeNotebookId,
        parentId: safeParentId,
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: defaultTitle }],
            },
          ],
        },
        isFolder: true,
        localPendingCreate: "folder",
        isLocked: false,
        fontSize: "default",
        fontFamily: "default",
        createdAt: now,
        updatedAt: now,
        order: now,
      });
      if (safeParentId && !expandedIds.includes(safeParentId)) {
        expandView(activeNotebookId, safeParentId);
      }
    },
    [activeNotebookId, expandedIds, expandView, isLocalFolder, pages, setPendingCreate],
  );

  const startCreateLocalFile = useCallback(
    (parentId?: string) => {
      if (!activeNotebookId || committingRef.current) return;
      void createNamedPage(parentId, activeNotebookId).then((id) => {
        if (id) openPageFromSidebar(id, "preview");
      });
    },
    [activeNotebookId],
  );

  const cancelPendingCreate = useCallback((id: string) => {
    if (committingRef.current) return;
    setPendingCreate((current) => (current?.id === id ? null : current));
  }, [setPendingCreate]);

  const commitPendingCreate = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const current = pendingCreate;
      if (committingRef.current || !current || current.id !== id || current.workspaceId !== activeNotebookId) return false;
      const workspaceId = current.workspaceId;
      const parent = current.parentId ? usePages.getState().pages[current.parentId] : undefined;
      if (current.parentId && (!parent || parent.trashedAt || parent.workspaceId !== workspaceId || (isLocalFolder && !parent.isFolder))) {
        throw new Error(uiText("theDestinationFolderNoLongerExists_0e13"));
      }
      committingRef.current = true;
      try {
        const createdId = await createLocalFolderRecord({ workspaceId, parentId: current.parentId, title: name });
        if (!createdId) throw new Error(uiText("couldNotCreateItemTheName_2735"));
        setPendingCreate((latest) => latest?.id === id ? null : latest);
        const stillActive = useNotebooks.getState().activeNotebookId === workspaceId;
        if (stillActive) {
          if (current.parentId) expandView(workspaceId, current.parentId);
          setExpandPageId(createdId);
        }
        toast.success(uiText("folderCreated_1541"));
        return true;
      } finally {
        committingRef.current = false;
      }
    },
    [activeNotebookId, createLocalFolderRecord, expandView, pendingCreate, setExpandPageId, setPendingCreate, isLocalFolder],
  );

  const handleItemDragStart = useCallback(
    (id: string) => {
      draggingItemIdRef.current = id;
      setDraggingItemId(id);
      if (!activeNotebookId) return;
      setSelectedView(activeNotebookId, id);
      setPendingTreeSelection({
        notebookId: activeNotebookId,
        pageId: id,
        previousHighlightedPageId: highlightedPageId ?? null,
      });
    },
    [activeNotebookId, highlightedPageId, setSelectedView],
  );

  const handleItemDragEnd = useCallback(() => {
    draggingItemIdRef.current = null;
    setDraggingItemId(null);
  }, []);
  return {
    ...input,
    startCreateLocalFolder,
    startCreateLocalFile,
    cancelPendingCreate,
    commitPendingCreate,
    handleItemDragStart,
    handleItemDragEnd,
  };
}
