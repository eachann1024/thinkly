import { finishNewPageName, normalizeNewFileName, useNewPageName } from "@/lib/new-page-name";
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
  const request = useNewPageName((state) => state.request);
  const committingRef = useRef(false);

  useEffect(() => {
    if (!request) return;
    const parent = request.parentId ? pages[request.parentId] : undefined;
    const missingParent = request.parentId && (
      !parent || parent.trashedAt || parent.workspaceId !== request.workspaceId ||
      (isLocalFolder && !parent.isFolder)
    );
    if (request.workspaceId !== activeNotebookId || missingParent) {
      finishNewPageName(request, null);
      setPendingCreate((current) => current?.id === request.id ? null : current);
      if (request.workspaceId === activeNotebookId && missingParent) {
        toast.error("目标文件夹已不存在，请重新选择位置");
      }
      return;
    }
    const now = Date.now();
    setPendingCreate((current) => current?.id === request.id ? current : {
      id: request.id, workspaceId: request.workspaceId, parentId: request.parentId,
      content: { type: "doc", content: [] }, localPendingCreate: "file",
      isFolder: false, isLocked: false, fontSize: "default", fontFamily: "default",
      createdAt: now, updatedAt: now, order: now,
    });
    if (request.parentId) expandView(request.workspaceId, request.parentId);
  }, [request, activeNotebookId, pages, isLocalFolder, expandView, setPendingCreate]);

  useEffect(() => {
    setPendingCreate((current) => current && current.workspaceId !== activeNotebookId ? null : current);
  }, [activeNotebookId, setPendingCreate]);

  const startCreateLocalFolder = useCallback(
    (parentId?: string) => {
      if (!activeNotebookId || !isLocalFolder) return;
      if (committingRef.current || useNewPageName.getState().request) return;
      const parentPage = parentId ? pages[parentId] : undefined;
      const safeParentId = parentPage?.isFolder ? parentId : undefined;
      const pendingId = `${PENDING_CREATE_ID_PREFIX}folder-${crypto.randomUUID()}`;
      const now = Date.now();
      const defaultTitle = "新建文件夹";
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
    const currentRequest = useNewPageName.getState().request;
    if (currentRequest?.id === id) finishNewPageName(currentRequest, null);
    setPendingCreate((current) => (current?.id === id ? null : current));
  }, [setPendingCreate]);

  const commitPendingCreate = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      const current = pendingCreate;
      if (committingRef.current || !current || current.id !== id || current.workspaceId !== activeNotebookId) return false;
      const workspaceId = current.workspaceId;
      const parent = current.parentId ? usePages.getState().pages[current.parentId] : undefined;
      if (current.parentId && (!parent || parent.trashedAt || parent.workspaceId !== workspaceId || (isLocalFolder && !parent.isFolder))) {
        throw new Error("目标文件夹已不存在，请重新选择位置");
      }
      committingRef.current = true;
      try {
        const folder = current.localPendingCreate === "folder";
        const currentRequest = useNewPageName.getState().request;
        const createdId = folder
          ? await createLocalFolderRecord({ workspaceId, parentId: current.parentId, title: name })
          : currentRequest?.id === id
            ? await currentRequest.create(normalizeNewFileName(name))
            : null;
        if (!createdId) throw new Error("创建失败：名称已存在或无写入权限，请修改后重试");
        setPendingCreate((latest) => latest?.id === id ? null : latest);
        const stillActive = useNotebooks.getState().activeNotebookId === workspaceId;
        if (currentRequest?.id === id) {
          // 写入可以完成，但已取消的请求不能再激活页面或打开标签。
          finishNewPageName(currentRequest, stillActive ? createdId : null);
          if (stillActive) setExpandPageId(createdId);
          return true;
        }
        if (stillActive) {
          if (current.parentId) expandView(workspaceId, current.parentId);
          setExpandPageId(createdId);
        }
        toast.success("已新建文件夹");
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
