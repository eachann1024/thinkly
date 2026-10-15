import { normalizeNewFileName } from "@/lib/new-page-name";
import { focusNewPage } from "@/stores/pages/actions/create/content";
import { useCallback, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import { PENDING_CREATE_ID_PREFIX } from "./shared";
import type { useMainTreeState } from "./useMainTreeState";

export function useMainTreeLocalCreation(
  input: ReturnType<typeof useMainTreeState>,
) {
  const {
    activeNotebookId,
    pages,
    createLocalFolderRecord,
    createLocalPageRecord,
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

  useEffect(() => {
    setPendingCreate((current) => current && current.workspaceId !== activeNotebookId ? null : current);
  }, [activeNotebookId, setPendingCreate]);

  const startCreateLocalItem = useCallback(
    (kind: "folder" | "file", parentId?: string) => {
      if (!activeNotebookId || !isLocalFolder) return;
      const parentPage = parentId ? pages[parentId] : undefined;
      const safeParentId = parentPage?.isFolder ? parentId : undefined;
      const pendingId = `${PENDING_CREATE_ID_PREFIX}${kind}-${Date.now()}`;
      const now = Date.now();
      const defaultTitle = kind === "folder" ? "新建文件夹" : "";
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
              content: defaultTitle ? [{ type: "text", text: defaultTitle }] : [],
            },
          ],
        },
        isFolder: kind === "folder",
        localPendingCreate: kind,
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

  const startCreateLocalFolder = useCallback(
    (parentId?: string) => startCreateLocalItem("folder", parentId),
    [startCreateLocalItem],
  );

  const startCreateLocalFile = useCallback(
    (parentId?: string) => startCreateLocalItem("file", parentId),
    [startCreateLocalItem],
  );

  const cancelPendingCreate = useCallback((id: string) => {
    setPendingCreate((current) => (current?.id === id ? null : current));
  }, [setPendingCreate]);

  const commitPendingCreate = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const current = pendingCreate;
      if (!current || current.id !== id || current.workspaceId !== activeNotebookId) return false;
      const workspaceId = current.workspaceId;
      if (current.parentId && !usePages.getState().pages[current.parentId]?.isFolder) {
        throw new Error("目标文件夹已不存在，请重新选择位置");
      }
      const folder = current.localPendingCreate === "folder";
      const createdId = folder
        ? await createLocalFolderRecord({ workspaceId, parentId: current.parentId, title: name })
        : await createLocalPageRecord({ workspaceId, parentId: current.parentId, title: normalizeNewFileName(name) });
      if (!createdId) throw new Error("创建失败：名称已存在或无写入权限，请修改后重试");
      setPendingCreate((latest) => latest?.id === id ? null : latest);
      if (current.parentId) expandView(workspaceId, current.parentId);
      setExpandPageId(createdId);
      if (folder) toast.success("已新建文件夹");
      else {
        focusNewPage(createdId);
        usePages.getState().setActivePage(createdId);
        openPageFromSidebar(createdId, "preview");
      }
      return true;
    },
    [activeNotebookId, createLocalFolderRecord, createLocalPageRecord, expandView, pendingCreate, setExpandPageId, setPendingCreate],
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
    startCreateLocalItem,
    startCreateLocalFolder,
    startCreateLocalFile,
    cancelPendingCreate,
    commitPendingCreate,
    handleItemDragStart,
    handleItemDragEnd,
  };
}
