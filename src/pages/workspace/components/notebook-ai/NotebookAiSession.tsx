import { Suspense, useCallback, useState, type ReactNode, type RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import { NotebookAiPanelVisibilityContext, NotebookAiSessionContext } from "./session/context";
import { createNotebookAiSessionPublication } from "./session/publication";

import { notebookAiSession } from "./notebookAiLoader";

const NotebookAiSessionBinder = notebookAiSession.Component;

export { useNotebookAiSession } from "./session/context";
export {
  getNotebookAiPlaceholderHints,
  formatNotebookAiChatError,
} from "./session/helpers";
export type { NotebookAiSessionValue } from "./session/types";

interface NotebookAiSessionProviderProps {
  notebookId: string;
  editorRef?: RefObject<EditorRef | null>;
  panelOpen?: boolean;
  children: ReactNode;
}

export function NotebookAiSessionProvider({
  notebookId,
  panelOpen = false,
  children,
}: NotebookAiSessionProviderProps) {
  const [held, setHeld] = useState(false);
  const [publication] = useState(createNotebookAiSessionPublication);
  if (panelOpen && !held) setHeld(true);
  const releaseRuntime = useCallback(() => {
    setHeld(false);
    publication.clear();
  }, [publication]);

  return (
    <NotebookAiSessionContext.Provider value={publication.store}>
      <NotebookAiPanelVisibilityContext.Provider value={panelOpen}>
        {held ? (
          <Suspense fallback={null}>
            <NotebookAiSessionBinder
              notebookId={notebookId}
              panelOpen={panelOpen}
              publish={publication.publish}
              onRelease={releaseRuntime}
            />
          </Suspense>
        ) : null}
        {children}
      </NotebookAiPanelVisibilityContext.Provider>
    </NotebookAiSessionContext.Provider>
  );
}
