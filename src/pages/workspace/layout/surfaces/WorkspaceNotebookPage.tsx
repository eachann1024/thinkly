import { NotebookAiSessionProvider } from "../../components/notebook-ai/NotebookAiSession";
import type { useWorkspaceScrollSync } from "../useWorkspaceScrollSync";
import { NotebookAiWorkspaceBody } from "./NotebookAiWorkspaceBody";

/** 设置与笔记互斥挂载；AI 会话运行时留在页面外，切页不中止进行中的请求。 */
export function WorkspaceNotebookPage({
  context,
}: {
  context: ReturnType<typeof useWorkspaceScrollSync>;
}) {
  const {
    settingsOpen, editorHostRef, editorRef, aiAvailableForNotebook, aiNotebookId,
    showFullscreenAi, showSideAiPanel,
  } = context;
  const aiAvailable = aiAvailableForNotebook && Boolean(aiNotebookId);
  const panelOpen = aiAvailable && (showFullscreenAi || showSideAiPanel);
  const body = settingsOpen ? null : (
    <NotebookAiWorkspaceBody
      {...context}
      showFullscreenAi={aiAvailable && showFullscreenAi}
      aiNotebookId={aiAvailable ? aiNotebookId : null}
      aiAvailableForNotebook={aiAvailable}
      aiPanelOpen={panelOpen}
      showSideAiPanel={aiAvailable && showSideAiPanel}
      aiPanelCapturedSelection={aiAvailable ? context.aiPanelCapturedSelection : null}
    />
  );

  return (
    <div
      ref={editorHostRef}
      data-workspace-page="notebook"
      hidden={settingsOpen}
      inert={settingsOpen}
      aria-hidden={settingsOpen}
      className="workspace-editor-host relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={settingsOpen ? { display: "none" } : undefined}
    >
      {aiAvailable && aiNotebookId ? (
        <NotebookAiSessionProvider
          notebookId={aiNotebookId}
          editorRef={editorRef}
          panelOpen={!settingsOpen && panelOpen}
        >
          {body}
        </NotebookAiSessionProvider>
      ) : body}
    </div>
  );
}
