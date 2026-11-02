import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/controller/renderMainTreeSurface.tsx#localMessages:1">`
zh-Hans:
  fileName_d2e2: "文件名称"
  page_59ce: "页面"
en:
  fileName_d2e2: "File name"
  page_59ce: "Page"
ja:
  fileName_d2e2: "ファイル名"
  page_59ce: "ページ"
`;
const uiText = createTranslator(localMessages);
import { type CSSProperties } from "react";
import { useMainTreeSurfaceCallbacks } from "./useMainTreeSurfaceCallbacks";
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
} from "react-complex-tree";
import type { Page } from "@/types";
import { MainTreeEdgeDropWatcher } from "../MainTreeEdgeDropWatcher";
import { getPageTitle } from "../treeAdapter";
import {
  renderItemArrow,
  renderItemsContainer,
  renderTreeContainer,
  renderDragBetweenLine,
} from "../MainTreeItem";
import {
  isLocalFolderDirectoryPage,
  isElectronLocalFolderDirectory,
  openPageFromSidebar,
} from "@/lib/sidebarPageNavigation";
import { MAIN_TREE_INDENT } from "../mainTreeDragGeometry";
import type { useMainTreeDragActions } from "./useMainTreeDragActions";

const getItemTitle = (item: import("react-complex-tree").TreeItem<Page>) =>
  item.index === "root" ? "" : item.data.localPendingCreate === "file" ? uiText("fileName_d2e2") : getPageTitle(item.data);

export function renderMainTreeSurface(context: ReturnType<typeof useMainTreeDragActions>) {
  return <MainTreeSurface context={context} />;
}

function MainTreeSurface({ context }: { context: ReturnType<typeof useMainTreeDragActions> }) {
  const callbacks = useMainTreeSurfaceCallbacks(context);
  const {
    viewportHeight, itemHeight, pages, draggingItemId, items,
    scrollContainerRef, lastClickModRef, verticalKeyboardNavigationRef,
    viewState, toggleLocalDirectory, handleMainTreeEdgeDrop,
  } = context;
  return (
    <ContextMenuTrigger asChild>
      <div
        ref={scrollContainerRef}
        className="sidebar-tree-scroll flex-1 min-h-0 min-w-0 w-full overflow-auto"
        style={
          {
            height: viewportHeight || undefined,
            "--main-tree-row-height": `${itemHeight}px`,
          } as CSSProperties
        }
        onKeyDownCapture={(event) => {
          const target = event.target as HTMLElement;
          if (target.matches("input, textarea") || target.isContentEditable) {
            return;
          }
          if (
            (event.key === "ArrowUp" || event.key === "ArrowDown") &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
          ) {
            verticalKeyboardNavigationRef.current = true;
          }
        }}
        onKeyUpCapture={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            verticalKeyboardNavigationRef.current = false;
          }
        }}
        onMouseDown={(e) => {
          verticalKeyboardNavigationRef.current = false;
          lastClickModRef.current = { meta: e.metaKey, ctrl: e.ctrlKey };
        }}
        onAuxClick={(e) => {
          if (e.button !== 1) return;
          const target = e.target as HTMLElement;
          const row = target.closest("[data-rct-item-id]");
          if (!row) return;
          const pageId = row.getAttribute("data-rct-item-id");
          if (!pageId || pageId === "root") return;
          const page = pages[pageId];
          if (!page) return;
          e.preventDefault();
          e.stopPropagation();
          if (isLocalFolderDirectoryPage(pageId)) {
            toggleLocalDirectory(pageId);
            if (isElectronLocalFolderDirectory(pageId)) return;
          }
          openPageFromSidebar(pageId, "permanent", { newTab: true });
        }}
      >
        <MainTreeEdgeDropWatcher
          containerRef={scrollContainerRef}
          draggingItemId={draggingItemId}
          draggedItem={draggingItemId ? items[draggingItemId] : undefined}
          onEdgeDrop={handleMainTreeEdgeDrop}
        />
        <ControlledTreeEnvironment<Page>
          items={items}
          getItemTitle={getItemTitle}
          viewState={viewState}
          defaultInteractionMode={InteractionMode.ClickArrowToExpand}
          canDragAndDrop={true}
          canReorderItems={true}
          canDropOnFolder={true}
          canDropOnNonFolder={false}
          renderDepthOffset={MAIN_TREE_INDENT}
          canRename={false}
          canSearch={false}
          canSearchByStartingTyping={false}
          {...callbacks}
          renderItemArrow={renderItemArrow}
          renderItemsContainer={renderItemsContainer}
          renderTreeContainer={renderTreeContainer}
          renderDragBetweenLine={renderDragBetweenLine}
        >
          <Tree treeId="main" rootItem="root" treeLabel={uiText("page_59ce")} />
        </ControlledTreeEnvironment>
      </div>
    </ContextMenuTrigger>
  );
}
