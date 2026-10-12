import { SidebarPanelControls } from "./SidebarPanelControls";
import { SidebarMainTree } from "../main-tree/SidebarMainTree";
import { SidebarSectionHeader } from "../SidebarSectionHeader";
import { SidebarOutline } from "../SidebarOutline";
import { SidebarSearch } from "../SidebarSearch";
import { HistoryVersionList } from "../../history/HistoryView";
import type { useSidebarHover } from "./useSidebarHover";

export function renderSidebarViews(
  context: ReturnType<typeof useSidebarHover>,
) {
  const {
    selectedPageId,
    scrollContainerRef,
    settingsOpen,
    activeNotebookId,
    outlineTarget,
    outlinePageId,
    setExpanded,
    electronNoVault,
    rowHeight,
    currentView,
    setSettingsSidebarHost,
    inHistoryMode,
    setScrollAreaNode,
    scrollAreaHeight,
    handleCreatePage,
    headerTitle,
  } = context;
  return (
    <div className="flex min-h-0 flex-1">
      <div
        ref={setSettingsSidebarHost}
        className="sidebar-content-surface relative flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {!settingsOpen && context.forceCollapseLeft && <SidebarPanelControls context={context} />}
        {inHistoryMode && !settingsOpen && (
          <div className="min-h-0 flex-1 overflow-hidden rounded-[inherit]">
            <HistoryVersionList />
          </div>
        )}
        <div
          className="sidebar-design flex min-h-0 flex-1 flex-col"
          hidden={inHistoryMode || settingsOpen}
          inert={inHistoryMode || settingsOpen}
          aria-hidden={inHistoryMode || settingsOpen}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]">
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className="sidebar-tree-heading shrink-0"
                hidden={currentView === "search"}
              >
                <SidebarSectionHeader
                  title={currentView === "search" ? "搜索" : headerTitle}
                  onCreate={
                    currentView === "pages" && !electronNoVault
                      ? handleCreatePage
                      : undefined
                  }
                  createTitle="新建笔记"
                  onCollapseAll={
                    currentView === "pages" && activeNotebookId
                      ? () => setExpanded(activeNotebookId, [])
                      : undefined
                  }
                />
              </div>
              <div
                ref={setScrollAreaNode}
                className="sidebar-content-pane flex min-h-0 flex-1 flex-col"
                data-sidebar-page-list=""
                hidden={currentView !== "pages"}
                inert={currentView !== "pages"}
                aria-hidden={currentView !== "pages"}
              >
                <SidebarMainTree
                  activeNotebookId={activeNotebookId}
                  selectedPageId={selectedPageId}
                  rowHeight={rowHeight}
                  itemHeight={rowHeight}
                  viewportHeight={scrollAreaHeight}
                  onCreatePage={handleCreatePage}
                />
              </div>
              <SidebarSearch />
              {currentView === "outline" && (
                <div className="flex min-h-0 flex-1 overflow-hidden pr-2">
                  <SidebarOutline
                    scrollContainerRef={scrollContainerRef}
                    pageId={outlinePageId}
                    focusKey={outlineTarget.focusKey}
                    paneId={outlineTarget.paneId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
