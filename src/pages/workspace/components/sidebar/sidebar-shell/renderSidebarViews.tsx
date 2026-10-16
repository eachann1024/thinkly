import { NotebookSwitcher } from "../NotebookSwitcher";
import { SidebarMainTree } from "../main-tree/SidebarMainTree";
import { SidebarSectionHeader } from "../SidebarSectionHeader";
import { SidebarOutline } from "../SidebarOutline";
import { SidebarSearch } from "../SidebarSearch";
import { HistoryVersionList } from "../../history/HistoryView";
import { WorkspaceViewActivity } from "../../WorkspaceViewActivity";
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
    sidebarCollapsed,
  } = context;
  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div
          ref={setSettingsSidebarHost}
          className="sidebar-content-surface relative flex min-h-0 min-w-0 flex-1 flex-col"
        >
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
                  className="sidebar-tree-heading sidebar-navigation-heading shrink-0"
                  hidden={currentView !== "pages"}
                >
                  <NotebookSwitcher
                    variant="header"
                    active={!sidebarCollapsed && !settingsOpen && !inHistoryMode && currentView === "pages"}
                  />
                  <SidebarSectionHeader
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
                  className="sidebar-content-pane sidebar-page-list flex min-h-0 flex-1 flex-col"
                  data-sidebar-page-list=""
                  hidden={currentView !== "pages"}
                  inert={currentView !== "pages"}
                  aria-hidden={currentView !== "pages"}
                >
                  <SidebarMainTree
                    activeNotebookId={activeNotebookId}
                    selectedPageId={selectedPageId}
                    itemHeight={rowHeight}
                    viewportHeight={scrollAreaHeight}
                  />
                </div>
                <SidebarSearch />
                <WorkspaceViewActivity
                  visible={currentView === "outline" && !settingsOpen && !inHistoryMode}
                  className="sidebar-outline-pane flex min-h-0 flex-1 overflow-hidden"
                >
                    <SidebarOutline
                      scrollContainerRef={scrollContainerRef}
                      pageId={outlinePageId}
                      focusKey={outlineTarget.focusKey}
                      paneId={outlineTarget.paneId}
                    />
                </WorkspaceViewActivity>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
