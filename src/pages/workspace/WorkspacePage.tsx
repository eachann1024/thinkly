import { useLocale } from "@/i18n";
import "./styles/index.css";
import "./styles/desktop-material.css";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useWorkspaceEvents } from "./hooks/useWorkspaceEvents";
import { useWeeklyReflection } from "./hooks/useWeeklyReflection";
import { useLocalFolderWatch } from "./hooks/useLocalFolderWatch";
import { useFileDrop } from "./hooks/useFileDrop";
import { useHistoryRecorder } from "@/hooks/useHistoryRecorder";
import { getContentSignature } from "@/components/editor/utils/blocknote-content";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { isElectronRuntime } from "@/lib/electron/runtime";
import { bindOptionWindowDrag } from "@/lib/electron/windowDrag";
import { HistoryViewProvider } from "./components/history/history-view/HistoryViewProvider";
import {
  EditorPaneRegistryProvider,
  createEditorPaneRegistry,
} from "./components/editor-split/editorPaneRegistry";

function PageHistoryBinder() {
  const activePageId = usePages((s) => s.activePageId);
  const page = usePages((s) =>
    activePageId ? s.pages[activePageId] : undefined,
  );
  const historyContentSig = useMemo(
    () => (page ? getContentSignature(page.content) : ""),
    [page],
  );
  useHistoryRecorder({
    pageId: activePageId ?? null,
    workspaceId: page?.workspaceId ?? null,
    content: page?.isFolder || page?.localReadState === "error" ? undefined : page?.content,
    signature: historyContentSig,
    updatedAt: page?.updatedAt,
  });
  return null;
}

export function WorkspacePage() {
  useLocale();
  const { activePageId, getPage } = usePages(useShallow((s) => ({ activePageId: s.activePageId, getPage: s.getPage })));
  const { activeNotebookId, notebooks } = useNotebooks(useShallow((s) => ({ activeNotebookId: s.activeNotebookId, notebooks: s.notebooks })));

  const page = activePageId ? getPage(activePageId) : undefined;
  const notebook = activeNotebookId ? notebooks[activeNotebookId] : undefined;

  const paneRegistry = useMemo(() => createEditorPaneRegistry(), []);
  const editorRef = paneRegistry.focusedEditorRef;
  const scrollContainerRef = paneRegistry.focusedScrollRef;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("is-electron");
    if (isElectronRuntime() && /Win/i.test(navigator.platform)) {
      root.classList.add("is-win");
    }
    if (isElectronRuntime() && /Linux/i.test(navigator.platform)) {
      root.classList.add("os-linux");
    }
    if (isElectronRuntime() && /Mac/i.test(navigator.platform)) {
      root.classList.add("os-mac");
      return bindOptionWindowDrag();
    }
  }, []);

  useWorkspaceEvents({ activePageId, page });
  useWeeklyReflection();
  useLocalFolderWatch({ notebook, activePageId, page });

  const {
    isDragging,
    dragIntent,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useFileDrop();

  return (
    <>
      <PageHistoryBinder />
      <EditorPaneRegistryProvider value={paneRegistry}>
        <HistoryViewProvider>
          <WorkspaceLayout
            isDragging={isDragging}
            dragIntent={dragIntent}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            editorRef={editorRef}
            scrollContainerRef={scrollContainerRef}
          />
        </HistoryViewProvider>
      </EditorPaneRegistryProvider>
    </>
  );
}
