import { useCallback, useEffect, useMemo, useRef } from "react";
import { type TreeItem, type TreeItemIndex } from "react-complex-tree";
import type { Page } from "@/types";
import { pagesToTreeItems } from "../treeAdapter";
import {
  isLocalFolderDirectoryPage,
  isElectronLocalFolderDirectory,
  openPageFromSidebar,
} from "@/lib/sidebarPageNavigation";
import { useSidebarPageReveal } from "../useSidebarPageReveal";
import { hasNotebookTreeScroll, useNotebookTreeScroll } from "../useNotebookTreeScroll";
import type { useMainTreeLocalCreation } from "./useMainTreeLocalCreation";

export function useMainTreeView(
  input: ReturnType<typeof useMainTreeLocalCreation>,
) {
  const {
    activeNotebookId,
    pages,
    expandPageId,
    setExpandPageId,
    localFolderOrders,
    pendingCreate,
    draggingItemId,
    pendingTreeSelection,
    setPendingTreeSelection,
    isLocalFolder,
    shouldShowLocalSkeleton,
    expandedIds,
    focusedId,
    selectedId,
    setExpanded,
    toggleView,
    setSelectedView,
    highlightedPageId,
    pendingSelectedId,
  } = input;

  const scopedPages = useMemo(() => {
    const list = Object.values(pages);
    if (
      pendingCreate &&
      activeNotebookId &&
      pendingCreate.workspaceId === activeNotebookId
    ) {
      return [...list, pendingCreate];
    }
    return list;
  }, [activeNotebookId, pages, pendingCreate]);

  const items = useMemo<Record<TreeItemIndex, TreeItem<Page>>>(() => {
    if (!activeNotebookId) {
      return {
        root: {
          index: "root",
          children: [],
          isFolder: true,
          data: {} as Page,
          canMove: false,
          canRename: false,
        },
      };
    }
    return pagesToTreeItems(
      scopedPages,
      activeNotebookId,
      isLocalFolder,
      localFolderOrders,
    );
  }, [scopedPages, activeNotebookId, isLocalFolder, localFolderOrders]);

  const rootChildren = items.root?.children ?? [];

  const hasPages = rootChildren.length > 0;

  const isAncestor = (ancestorId: string, descendantId: string) => {
    let pid: string | undefined = pages[descendantId]?.parentId;
    while (pid) {
      if (pid === ancestorId) return true;
      pid = pages[pid]?.parentId;
    }
    return false;
  };

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const restoreNotebookScroll = hasNotebookTreeScroll(activeNotebookId);
  useNotebookTreeScroll(activeNotebookId, scrollContainerRef, hasPages && !shouldShowLocalSkeleton);

  const lastClickModRef = useRef({ meta: false, ctrl: false });

  const verticalKeyboardNavigationRef = useRef(false);

  const viewState = useMemo(() => {
    const creatingInCurrentNotebook = pendingCreate?.workspaceId === activeNotebookId;
    const highlightSelection =
      creatingInCurrentNotebook
        ? []
        : draggingItemId && items[draggingItemId]
        ? [draggingItemId]
        : pendingSelectedId && items[pendingSelectedId]
          ? [pendingSelectedId]
          : highlightedPageId
            ? items[highlightedPageId] ? [highlightedPageId] : []
            : selectedId
              ? [selectedId]
              : [];
    return {
      main: {
        expandedItems: expandedIds,
        selectedItems: highlightSelection as TreeItemIndex[],
        focusedItem: (creatingInCurrentNotebook ? undefined : focusedId ?? undefined) as TreeItemIndex | undefined,
      },
    };
  }, [
    draggingItemId,
    expandedIds,
    focusedId,
    selectedId,
    highlightedPageId,
    pendingSelectedId,
    pendingCreate,
    activeNotebookId,
    items,
  ]);

  useEffect(() => {
    if (!pendingTreeSelection) return;
    if (pendingTreeSelection.notebookId !== activeNotebookId) {
      setPendingTreeSelection(null);
      return;
    }
    if (
      highlightedPageId === pendingTreeSelection.pageId ||
      (highlightedPageId !== pendingTreeSelection.previousHighlightedPageId &&
        highlightedPageId !== pendingTreeSelection.pageId)
    ) {
      setPendingTreeSelection(null);
    }
  }, [activeNotebookId, highlightedPageId, pendingTreeSelection]);

  const consumeRevealRequest = useCallback((pageId: string) => {
    const store = usePages.getState();
    if (store.expandPageId === pageId) store.setExpandPageId(null);
  }, []);

  useSidebarPageReveal({
    activeNotebookId,
    preserveNotebookScroll: restoreNotebookScroll,
    highlightedPageId,
    expandPageId,
    pages,
    expandedIds,
    treeReady: hasPages && !shouldShowLocalSkeleton,
    scrollContainerRef,
    setExpanded,
    consumeRequest: consumeRevealRequest,
  });

  const toggleLocalDirectory = useCallback(
    (pageId: string) => {
      if (!activeNotebookId || !isLocalFolderDirectoryPage(pageId)) return;
      toggleView(activeNotebookId, pageId);
    },
    [activeNotebookId, toggleView],
  );

  const activateLocalDirectory = useCallback(
    (pageId: string, mode: "preview" | "permanent") => {
      if (!activeNotebookId || !isLocalFolderDirectoryPage(pageId)) return;
      if (isElectronLocalFolderDirectory(pageId)) return;
      setPendingTreeSelection({
        notebookId: activeNotebookId,
        pageId,
        previousHighlightedPageId: highlightedPageId ?? null,
      });
      setSelectedView(activeNotebookId, pageId);
      openPageFromSidebar(pageId, mode);
    },
    [activeNotebookId, highlightedPageId, setSelectedView],
  );
  return {
    ...input,
    scopedPages,
    items,
    rootChildren,
    hasPages,
    isAncestor,
    scrollContainerRef,
    lastClickModRef,
    verticalKeyboardNavigationRef,
    viewState,
    consumeRevealRequest,
    toggleLocalDirectory,
    activateLocalDirectory,
  };
}
