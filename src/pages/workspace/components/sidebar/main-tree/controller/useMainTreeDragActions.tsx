import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/controller/useMainTreeDragActions.tsx#localMessages:1">`
zh-Hans:
  moveFailed: "移动失败：{{error}}"
en:
  moveFailed: "Move failed: {{error}}"
ja:
  moveFailed: "移動に失敗しました：{{error}}"
`;
const uiText = createTranslator(localMessages);
import { type DraggingPosition, type TreeItem } from "react-complex-tree";
import type { Page } from "@/types";
import { toast } from "@/components/ui/sonner";
import {
  mainTreeEdgeDropTarget,
  type MainTreeEdgeZone,
} from "../mainTreeEdgeDrop";
import {
  LOCAL_FOLDER_ROOT_DIR_KEY,
  applyLocalFolderReorder,
  insertLocalFolderOrder,
} from "@/stores/localFolderOrder";
import type { useMainTreeView } from "./useMainTreeView";

export function useMainTreeDragActions(
  input: ReturnType<typeof useMainTreeView>,
) {
  useLocale();
  const {
    activeNotebookId,
    pages,
    reorderPages,
    moveLocalPage,
    getChildren,
    setPendingTreeSelection,
    isLocalFolder,
    expandedIds,
    expandView,
    setSelectedView,
    highlightedPageId,
    rootChildren,
    isAncestor,
  } = input;

  const handleDrop = (
    droppedItems: TreeItem<Page>[],
    target: DraggingPosition,
  ) => {
    if (!activeNotebookId) return;
    const dragIds = droppedItems
      .map((it) => String(it.index))
      .filter((id) => id !== "root");
    if (dragIds.length === 0) return;

    let newParentId: string | undefined;
    let insertIndex: number;
    if (target.targetType === "between-items") {
      const pid = String(target.parentItem);
      newParentId = pid === "root" ? undefined : pid;
      insertIndex = target.childIndex;
    } else if (target.targetType === "item") {
      const pid = String(target.targetItem);
      newParentId = pid === "root" ? undefined : pid;
      insertIndex = -1;
    } else {
      newParentId = undefined;
      insertIndex = -1;
    }

    if (
      newParentId &&
      dragIds.some((id) => id === newParentId || isAncestor(id, newParentId!))
    ) {
      return;
    }

    const keepDragSelection = () => {
      const keepId = dragIds[0];
      if (!keepId) return;
      setSelectedView(activeNotebookId, keepId);
      setPendingTreeSelection({
        notebookId: activeNotebookId,
        pageId: keepId,
        previousHighlightedPageId: highlightedPageId ?? null,
      });
    };

    if (isLocalFolder) {
      const sameDirDrop = dragIds.every(
        (id) => usePages.getState().pages[id]?.parentId === newParentId,
      );
      if (target.targetType === "between-items" && sameDirDrop) {
        const siblings = getChildren(newParentId, activeNotebookId).filter(
          (page) => !page.localUnsaved,
        );
        if (
          applyLocalFolderReorder(
            activeNotebookId,
            newParentId ?? LOCAL_FOLDER_ROOT_DIR_KEY,
            siblings,
            dragIds,
            target.childIndex,
          )
        ) {
          keepDragSelection();
          return;
        }
      }

      void (async () => {
        const movedIds: string[] = [];
        for (const id of dragIds) {
          try {
            await moveLocalPage(id, newParentId);
            movedIds.push(id);
          } catch (err) {
            toast.error(uiText("moveFailed", { error: (err as Error).message ?? String(err) }));
          }
        }
        if (!sameDirDrop && insertIndex >= 0 && movedIds.length > 0) {
          insertLocalFolderOrder(
            activeNotebookId,
            newParentId ?? LOCAL_FOLDER_ROOT_DIR_KEY,
            getChildren(newParentId, activeNotebookId).filter(
              (page) => !page.localUnsaved,
            ),
            movedIds,
            insertIndex,
          );
        }
        if (newParentId && !expandedIds.includes(newParentId)) {
          expandView(activeNotebookId, newParentId);
        }
        keepDragSelection();
      })();
      return;
    }

    const allChildren = getChildren(newParentId, activeNotebookId).map(
      (p) => p.id,
    );
    if (insertIndex > 0) {
      const removedBefore = dragIds.filter((id) => {
        const idx = allChildren.indexOf(id);
        return idx >= 0 && idx < insertIndex;
      }).length;
      insertIndex -= removedBefore;
    }
    const siblings = allChildren.filter((id) => !dragIds.includes(id));

    const finalIds =
      insertIndex < 0
        ? [...siblings, ...dragIds]
        : [
            ...siblings.slice(0, insertIndex),
            ...dragIds,
            ...siblings.slice(insertIndex),
          ];

    reorderPages(finalIds, newParentId);

    if (newParentId && !expandedIds.includes(newParentId)) {
      expandView(activeNotebookId, newParentId);
    }
    keepDragSelection();
  };

  const handleMainTreeEdgeDrop = (
    zone: MainTreeEdgeZone,
    item: TreeItem<Page>,
  ) => {
    handleDrop([item], mainTreeEdgeDropTarget(zone, rootChildren.length));
  };
  return { ...input, handleDrop, handleMainTreeEdgeDrop };
}
