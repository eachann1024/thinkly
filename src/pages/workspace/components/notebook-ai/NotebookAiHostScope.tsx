import { useMemo, type ReactNode } from "react";
import type { Page } from "@/types";
import { usePages } from "@/stores/usePages";
import { EditorHostBridge } from "@/pages/workspace/components/editor-host/EditorHostBridge";

function createSyntheticAiHostPage(notebookId: string): Page {
  const now = Date.now();
  return {
    id: `__notebook-ai-host__${notebookId}`,
    workspaceId: notebookId,
    content: { type: "doc", content: [] },
    isLocked: false,
    fontSize: "default",
    fontFamily: "default",
    createdAt: now,
    updatedAt: now,
  };
}

const ignoreContentChange = () => {};

interface NotebookAiHostScopeProps {
  notebookId: string;
  children: ReactNode;
}

export function NotebookAiHostScope({
  notebookId,
  children,
}: NotebookAiHostScopeProps) {
  const activePageId = usePages((s) => {
    const id = s.activePageId;
    const page = id ? s.pages[id] : undefined;
    return page && page.workspaceId === notebookId && !page.trashedAt
      ? page.id
      : undefined;
  });
  const hostPage = useMemo(
    () => (activePageId ? usePages.getState().pages[activePageId] : undefined)
      ?? createSyntheticAiHostPage(notebookId),
    [activePageId, notebookId],
  );

  return (
    <EditorHostBridge
      page={hostPage}
      isEditorFullWidth
      onContentChangeOverride={ignoreContentChange}
    >
      {children}
    </EditorHostBridge>
  );
}
