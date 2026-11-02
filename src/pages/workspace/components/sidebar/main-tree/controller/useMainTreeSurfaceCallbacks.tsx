import { useLayoutEffect, useMemo, useRef } from "react";
import type { ControlledTreeEnvironmentProps } from "react-complex-tree";
import type { Page } from "@/types";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { isLocalFolderDirectoryPage, isElectronLocalFolderDirectory, openPageFromSidebar, shouldSuppressSidebarSelect } from "@/lib/sidebarPageNavigation";
import { renderItem } from "../MainTreeItem";
import type { useMainTreeDragActions } from "./useMainTreeDragActions";

type Context = ReturnType<typeof useMainTreeDragActions>;
type Callbacks = Pick<ControlledTreeEnvironmentProps<Page>,
  "canDropAt" | "onExpandItem" | "onCollapseItem" | "onFocusItem" |
  "onSelectItems" | "onPrimaryAction" | "onDrop" | "renderItem">;

export function useMainTreeSurfaceCallbacks(context: Context): Callbacks {
  const latest = useRef(context);
  useLayoutEffect(() => { latest.current = context; });
  const actions = useMemo(() => ({
    startCreateLocalFile: (...args: Parameters<Context["startCreateLocalFile"]>) => latest.current.startCreateLocalFile(...args),
    startCreateLocalFolder: (...args: Parameters<Context["startCreateLocalFolder"]>) => latest.current.startCreateLocalFolder(...args),
    commitPendingCreate: (...args: Parameters<Context["commitPendingCreate"]>) => latest.current.commitPendingCreate(...args),
    cancelPendingCreate: (...args: Parameters<Context["cancelPendingCreate"]>) => latest.current.cancelPendingCreate(...args),
    handleItemDragStart: (...args: Parameters<Context["handleItemDragStart"]>) => latest.current.handleItemDragStart(...args),
    handleItemDragEnd: (...args: Parameters<Context["handleItemDragEnd"]>) => latest.current.handleItemDragEnd(...args),
    activateLocalDirectory: (...args: Parameters<Context["activateLocalDirectory"]>) => latest.current.activateLocalDirectory(...args),
  }), []);
  return useMemo<Callbacks>(() => ({
    canDropAt: (dragItems, target) => {
      const { pages, isLocalFolder, isAncestor } = latest.current;
      const targetId =
        target.targetType === "between-items"
          ? String(target.parentItem)
          : String((target as any).targetItem);
      if (targetId === "root") return true;
      const parentPage = pages[targetId];
      if (isLocalFolder && parentPage && !parentPage.isFolder)
        return false;
      return !dragItems.some((it) => {
        const id = String(it.index);
        return id === targetId || isAncestor(id, targetId);
      });
    },
    onExpandItem: (item) => {
      const { activeNotebookId, expandView } = latest.current;
      if (!activeNotebookId) return;
      expandView(activeNotebookId, String(item.index));
    },
    onCollapseItem: (item) => {
      const { activeNotebookId, collapseView } = latest.current;
      if (!activeNotebookId) return;
      collapseView(activeNotebookId, String(item.index));
    },
    onFocusItem: (item) => {
      const { activeNotebookId, pages, setFocusedView, setSelectedView, verticalKeyboardNavigationRef } = latest.current;
      if (!activeNotebookId) return;
      const pageId = String(item.index);
      setFocusedView(activeNotebookId, pageId);

      if (!verticalKeyboardNavigationRef.current) return;
      verticalKeyboardNavigationRef.current = false;
      if (pageId === "root" || !pages[pageId]) return;
      if (isElectronLocalFolderDirectory(pageId)) return;
      setSelectedView(activeNotebookId, pageId);
      openPageFromSidebar(pageId, "preview");
    },
    onSelectItems: (selected) => {
      const { activeNotebookId, pages, draggingItemIdRef, setSelectedView, lastClickModRef, toggleLocalDirectory } = latest.current;
      if (!activeNotebookId) return;
      if (draggingItemIdRef.current) return;
      const last =
        selected.length > 0
          ? String(selected[selected.length - 1])
          : null;
      if (
        last &&
        last !== "root" &&
        isElectronLocalFolderDirectory(last)
      ) {
        if (shouldSuppressSidebarSelect()) return;
        setSelectedView(activeNotebookId, last);
        return;
      }
      setSelectedView(activeNotebookId, last);
      if (!last || last === "root") return;
      if (shouldSuppressSidebarSelect()) return;
      const page = pages[last];
      if (!page) return;
      if (isLocalFolderDirectoryPage(last)) {
        toggleLocalDirectory(last);
      }
      const { meta, ctrl } = lastClickModRef.current;
      if (isPlatformPrimaryModifierEvent({ metaKey: meta, ctrlKey: ctrl })) {
        openPageFromSidebar(last, "permanent", { newTab: true });
      } else {
        openPageFromSidebar(last, "preview");
      }
    },
    onPrimaryAction: (item) => {
      const { toggleLocalDirectory } = latest.current;
      const id = String(item.index);
      if (id === "root") return;
      if (isLocalFolderDirectoryPage(id)) {
        toggleLocalDirectory(id);
        if (isElectronLocalFolderDirectory(id)) return;
      }
      openPageFromSidebar(id, "preview");
    },
    onDrop: (...args) => latest.current.handleDrop(...args),
    renderItem: (args) =>
      renderItem({
        ...args,
        onCreateLocalFile: actions.startCreateLocalFile,
        onCreateLocalFolder: actions.startCreateLocalFolder,
        onCommitPendingCreate: actions.commitPendingCreate,
        onCancelPendingCreate: actions.cancelPendingCreate,
        onItemDragStart: actions.handleItemDragStart,
        onItemDragEnd: actions.handleItemDragEnd,
        onActivateLocalDirectory: actions.activateLocalDirectory,
      })
          ,
  }), [actions]);
}
