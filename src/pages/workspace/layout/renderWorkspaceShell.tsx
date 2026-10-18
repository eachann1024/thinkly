import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/layout/renderWorkspaceShell.tsx#localMessages:1">`
zh-Hans:
  dropToOpenFolder: "松手打开文件夹"
  dropToImportIntoTheCurrentFolder: "松手导入 Markdown 到侧边栏"
  dropToImportTextFile: "松手插入到笔记"
  dropToCheckFile: "侧边栏仅接收 Markdown；其他文件请拖入编辑器"
  opensAsALocalFolderNotebook: "会作为本地文件夹笔记本载入"
  supportsMdMarkdownAndTxt: "支持 .md、.markdown"
en:
  dropToOpenFolder: "Drop to open folder"
  dropToImportIntoTheCurrentFolder: "Drop to import Markdown into sidebar"
  dropToImportTextFile: "Drop to insert into note"
  dropToCheckFile: "Markdown only in sidebar · Drop other files into editor"
  opensAsALocalFolderNotebook: "Opens as a local folder notebook"
  supportsMdMarkdownAndTxt: "Supports .md and .markdown"
ja:
  dropToOpenFolder: "ドロップしてフォルダを開く"
  dropToImportIntoTheCurrentFolder: "ドロップしてサイドバーに Markdown を読み込む"
  dropToImportTextFile: "ドロップしてノートに挿入"
  dropToCheckFile: "サイドバーは Markdown のみ · 他のファイルはエディターへ"
  opensAsALocalFolderNotebook: "ローカルフォルダのノートブックとして読み込まれます"
  supportsMdMarkdownAndTxt: ".md、.markdown に対応"
`;
const uiText = createTranslator(localMessages);
import { cn } from "@/lib/utils";
import { SearchSessionController } from "../components/sidebar/SearchSessionController";
import { Sidebar } from "../components/sidebar/Sidebar";
import { LazySearchSheet } from "../components/search-sheet/LazySearchSheet";
import { DesktopTitleBar } from "../components/page/DesktopTitleBar";
import { LocalFolderTargetPicker } from "../components/sidebar/LocalFolderTargetPicker";
import { AIFeatureNotice } from "../components/AIFeatureNotice";
import {
  permanentlyDeletePageWithCleanup,
  restorePageWithToast,
} from "@/lib/page-delete-actions";
import { NotebookAiSessionProvider } from "../components/notebook-ai/NotebookAiSession";
import type { useWorkspaceScrollSync } from "./useWorkspaceScrollSync";
import { isElectronChrome, NotebookAiWorkspaceBody } from "./shared";

export function renderWorkspaceShell(
  context: ReturnType<typeof useWorkspaceScrollSync>,
) {
  const {
    isDragging,
    dragIntent,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    editorRef,
    scrollContainerRef,
    activePageId,
    isLocked,
    isTrashed,
    openNewTab,
    isWelcomeTab,
    openNewTabHandler,
    aiPanelOpen,
    aiLayoutMode,
    setAiLayoutMode,
    closeAiPanel,
    aiPanelCapturedSelection,
    consumeAiPanelCapturedSelection,
    showSideAiPanel,
    showFullscreenAi,
    singleTabMode,
    inHistoryMode,
    page,
    isLocalFolderPage,
    aiAvailableForNotebook,
    aiNotebookId,
    settingsOpen,
    settingsSidebarExpanded,
    setSettingsSidebarExpanded,
    effectiveSidebarCollapsed,
    settingsTab,
    setSettingsTab,
    settingsHost,
    setSettingsHost,
    editorHostRef,
    closeSettings,
    handleSettingsOpenChange,
  } = context;
  return (
    <>
      <div
        className="workspace-shell window-shell-safe-top flex overflow-hidden bg-background text-foreground"
        data-electron-chrome={isElectronChrome || undefined}
        data-settings={settingsOpen || undefined}
        data-file-drop-target={isDragging ? dragIntent : undefined}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isElectronChrome && (
          <DesktopTitleBar
            page={settingsOpen ? undefined : page}
            isWelcomeTab={isWelcomeTab}
            inHistoryMode={!settingsOpen && inHistoryMode}
            settingsOpen={settingsOpen}
            sidebarCollapsedOverride={effectiveSidebarCollapsed}
            onToggleSidebar={
              settingsOpen
                ? () => setSettingsSidebarExpanded((expanded) => !expanded)
                : undefined
            }
            onOpenSearch={() => {
              closeSettings();
              if (showFullscreenAi) closeAiPanel();
              openNewTab();
            }}
            onBeforeActivateTab={() => {
              closeSettings();
              if (showFullscreenAi) closeAiPanel();
            }}
            onRestore={
              activePageId
                ? () => restorePageWithToast(activePageId)
                : undefined
            }
            onDelete={
              activePageId
                ? () => void permanentlyDeletePageWithCleanup(activePageId)
                : undefined
            }
            aiPanelOpen={!settingsOpen && (showFullscreenAi || showSideAiPanel)}
            aiLayoutMode={aiLayoutMode}
          />
        )}
        {isDragging && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[25000] -translate-x-1/2 rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground" role="status">
            {(dragIntent === "rejected" || dragIntent === "pending") ? uiText("dropToCheckFile") : dragIntent === "editor" ? uiText("dropToImportTextFile") : uiText("dropToImportIntoTheCurrentFolder")}
          </div>
        )}
        <SearchSessionController />
        <LocalFolderTargetPicker />
        <AIFeatureNotice />
        <div ref={context.workspaceStageRef} className="workspace-stage">
          <Sidebar
            className="workspace-sidebar-pane"
            disableResize={false}
            selectedPageId={showFullscreenAi ? null : activePageId}
            scrollContainerRef={scrollContainerRef}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={handleSettingsOpenChange}
            settingsSidebarExpanded={settingsSidebarExpanded}
            onSettingsSidebarExpandedChange={setSettingsSidebarExpanded}
            settingsTab={settingsTab}
            onSettingsTabChange={setSettingsTab}
            settingsMainHost={settingsHost}
          />

          <main
            ref={setSettingsHost}
            className="workspace-main-sheet relative flex-1 flex flex-col h-full overflow-hidden"
            data-single-tab-mode={singleTabMode ? "true" : undefined}
            data-local-file-page={isLocalFolderPage ? "true" : undefined}
          >
            <div
              ref={editorHostRef}
              className={cn(
                "workspace-editor-host relative flex min-h-0 flex-1 flex-col overflow-hidden",
                settingsOpen && "invisible",
              )}
            >
              {/*
                第一次打开面板才加载会话运行时。之后 Provider 常驻，
                关面板 / 切页不卸载 useChat，顶栏动画可跟到请求真正结束。
              */}
              {aiAvailableForNotebook && aiNotebookId ? (
                <NotebookAiSessionProvider
                  notebookId={aiNotebookId}
                  editorRef={editorRef}
                  panelOpen={showFullscreenAi || showSideAiPanel}
                >
                  <NotebookAiWorkspaceBody
                    showFullscreenAi={showFullscreenAi}
                    aiNotebookId={aiNotebookId}
                    aiAvailableForNotebook={aiAvailableForNotebook}
                    isWelcomeTab={isWelcomeTab}
                    openNewTabHandler={openNewTabHandler}
                    aiPanelOpen={showFullscreenAi || showSideAiPanel}
                    aiLayoutMode={aiLayoutMode}
                    showSideAiPanel={showSideAiPanel}
                    closeAiPanel={closeAiPanel}
                    editorRef={editorRef}
                    aiPanelCapturedSelection={aiPanelCapturedSelection}
                    consumeAiPanelCapturedSelection={
                      consumeAiPanelCapturedSelection
                    }
                    setAiLayoutMode={setAiLayoutMode}
                    activePageId={activePageId}
                    page={page}
                    inHistoryMode={inHistoryMode}
                    isLocalFolderPage={isLocalFolderPage}
                    isLocked={isLocked}
                    isTrashed={isTrashed}
                    scrollContainerRef={scrollContainerRef}
                  />
                </NotebookAiSessionProvider>
              ) : (
                <NotebookAiWorkspaceBody
                  showFullscreenAi={false}
                  aiNotebookId={null}
                  aiAvailableForNotebook={false}
                  isWelcomeTab={isWelcomeTab}
                  openNewTabHandler={openNewTabHandler}
                  aiPanelOpen={false}
                  aiLayoutMode={aiLayoutMode}
                  showSideAiPanel={false}
                  closeAiPanel={closeAiPanel}
                  editorRef={editorRef}
                  aiPanelCapturedSelection={null}
                  consumeAiPanelCapturedSelection={
                    consumeAiPanelCapturedSelection
                  }
                  setAiLayoutMode={setAiLayoutMode}
                  activePageId={activePageId}
                  page={page}
                  inHistoryMode={inHistoryMode}
                  isLocalFolderPage={isLocalFolderPage}
                  isLocked={isLocked}
                  isTrashed={isTrashed}
                  scrollContainerRef={scrollContainerRef}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <LazySearchSheet aiNotebookId={aiAvailableForNotebook ? aiNotebookId : null} />
    </>
  );
}
