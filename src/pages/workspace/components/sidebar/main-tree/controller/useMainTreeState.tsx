import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/controller/useMainTreeState.tsx#localMessages:1">`
zh-Hans:
  nameSortingRestored_df43: "已恢复名称排序"
  sortByName_5b70: "恢复名称排序"
  couldNotReadLocalFolder_198b: "无法读取本地文件夹"
en:
  nameSortingRestored_df43: "Name sorting restored"
  sortByName_5b70: "Sort by name"
  couldNotReadLocalFolder_198b: "Could not read local folder"
ja:
  nameSortingRestored_df43: "名前順に戻しました"
  sortByName_5b70: "名前順に戻す"
  couldNotReadLocalFolder_198b: "ローカルフォルダを読み込めませんでした"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Page } from "@/types";
import { toast } from "@/components/ui/sonner";
import { useNotebooks } from "@/stores/useNotebooks";
import {
  useSidebarView,
  selectExpandedIds,
  selectFocusedId,
  selectSelectedId,
} from "@/stores/useSidebarView";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { areSidebarPagesEqual } from "@/stores/pages/areSidebarPagesEqual";
import {
  LOCAL_FOLDER_ROOT_DIR_KEY,
  clearLocalFolderOrder,
  useLocalFolderManualOrder,
  useLocalFolderOrders,
} from "@/stores/localFolderOrder";
import { type SidebarMainTreeProps, scheduleAfterMenuClose } from "./shared";

export function useMainTreeState({
  activeNotebookId,
  selectedPageId,
  viewportHeight,
  itemHeight,
}: SidebarMainTreeProps) {
  useLocale();
  const pages = useStoreWithEqualityFn(
    usePages,
    (s) => s.pages,
    areSidebarPagesEqual,
  );

  const activePageId = usePages((s) => s.activePageId);

  const reorderPages = usePages((s) => s.reorderPages);

  const moveLocalPage = usePages((s) => s.moveLocalPage);

  const createLocalFolderRecord = usePages((s) => s.createLocalFolderRecord);

  const createLocalPageRecord = usePages((s) => s.createLocalPageRecord);

  const getChildren = usePages((s) => s.getChildren);

  const expandPageId = usePages((s) => s.expandPageId);

  const setExpandPageId = usePages((s) => s.setExpandPageId);

  const localFolderOrders = useLocalFolderOrders((s) =>
    activeNotebookId ? s.ordersByNotebook[activeNotebookId] : undefined,
  );

  const rootHasManualOrder = useLocalFolderManualOrder(
    activeNotebookId,
    LOCAL_FOLDER_ROOT_DIR_KEY,
  );

  const rootOrderMenuGroup = rootHasManualOrder ? (
    <ContextMenuGroup>

      <ContextMenuItem
        onSelect={() =>
          scheduleAfterMenuClose(() => {
            if (!activeNotebookId) return;
            if (
              clearLocalFolderOrder(activeNotebookId, LOCAL_FOLDER_ROOT_DIR_KEY)
            ) {
              toast.success(uiText("nameSortingRestored_df43"));
            }
          })
        }
      >
        <GooseIcons.ArrowDownAZ className="h-4 w-4" />
        <span>{uiText("sortByName_5b70")}</span>
      </ContextMenuItem>
    </ContextMenuGroup>
  ) : null;

  const [pendingCreate, setPendingCreate] = useState<Page | null>(null);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const draggingItemIdRef = useRef<string | null>(null);

  const [pendingTreeSelection, setPendingTreeSelection] = useState<{
    notebookId: string;
    pageId: string;
    previousHighlightedPageId: string | null;
  } | null>(null);

  const notebook = activeNotebookId
    ? useNotebooks.getState().notebooks[activeNotebookId]
    : undefined;

  const isLocalFolder = notebook?.source === "local-folder";

  const localLoadState = useNotebooks((state) =>
    activeNotebookId
      ? state.localFolderLoadStates[activeNotebookId]
      : undefined,
  );

  const localLoadStatus = localLoadState?.status ?? "idle";

  const hasCachedLocalTree = useMemo(() => Boolean(
    activeNotebookId &&
    Object.values(pages).some(
      (page) =>
        page.workspaceId === activeNotebookId &&
        !page.trashedAt &&
        !page.localUnsaved,
    ),
  ), [activeNotebookId, pages]);

  const shouldShowLocalSkeleton =
    isLocalFolder && localLoadStatus === "loading" && !hasCachedLocalTree;

  const localLoadError =
    isLocalFolder && localLoadState?.status === "error"
      ? localLoadState?.error || uiText("couldNotReadLocalFolder_198b")
      : null;

  const retryLocalFolderLoad = useCallback(() => {
    if (!activeNotebookId || !notebook?.localPath) return;
    void usePages
      .getState()
      .loadLocalFolderPages(activeNotebookId, notebook.localPath, {
        forceRead: true,
      })
      .catch((error) => {
        console.error("[local-folder] retry failed", error);
      });
  }, [activeNotebookId, notebook?.localPath]);

  const expandedIds = useSidebarView(selectExpandedIds(activeNotebookId));

  const focusedId = useSidebarView(selectFocusedId(activeNotebookId));

  const selectedId = useSidebarView(selectSelectedId(activeNotebookId));

  const setExpanded = useSidebarView((s) => s.setExpanded);

  const expandView = useSidebarView((s) => s.expand);

  const collapseView = useSidebarView((s) => s.collapse);

  const toggleView = useSidebarView((s) => s.toggle);

  const setFocusedView = useSidebarView((s) => s.setFocused);

  const setSelectedView = useSidebarView((s) => s.setSelected);

  const highlightedPageId =
    selectedPageId !== undefined ? selectedPageId : activePageId;

  const pendingSelectedId =
    pendingTreeSelection?.notebookId === activeNotebookId
      ? pendingTreeSelection.pageId
      : null;
  return {
    activeNotebookId,
    selectedPageId,
    viewportHeight,
    itemHeight,
    pages,
    activePageId,
    reorderPages,
    moveLocalPage,
    createLocalFolderRecord,
    createLocalPageRecord,
    getChildren,
    expandPageId,
    setExpandPageId,
    localFolderOrders,
    rootHasManualOrder,
    rootOrderMenuGroup,
    pendingCreate,
    setPendingCreate,
    draggingItemId,
    setDraggingItemId,
    draggingItemIdRef,
    pendingTreeSelection,
    setPendingTreeSelection,
    notebook,
    isLocalFolder,
    localLoadState,
    localLoadStatus,
    hasCachedLocalTree,
    shouldShowLocalSkeleton,
    localLoadError,
    retryLocalFolderLoad,
    expandedIds,
    focusedId,
    selectedId,
    setExpanded,
    expandView,
    collapseView,
    toggleView,
    setFocusedView,
    setSelectedView,
    highlightedPageId,
    pendingSelectedId,
  };
}
