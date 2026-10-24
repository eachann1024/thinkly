import { lazy, Suspense, useCallback, useState, type ReactNode, type RefObject } from "react";
import type { EditorRef } from "@/components/editor/core/Editor";
import { NotebookAiSessionContext } from "./session/context";
import type { NotebookAiSessionValue } from "./session/types";

const NotebookAiSessionBinder = lazy(() =>
  import("./NotebookAiSessionBinder").then((mod) => ({
    default: mod.NotebookAiSessionBinder,
  })),
);

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
  const [session, setSession] = useState<NotebookAiSessionValue | null>(null);
  if (panelOpen && !held) setHeld(true);
  const publish = useCallback((value: NotebookAiSessionValue) => {
    setSession((prev) => (prev === value ? prev : value));
  }, []);
  const releaseRuntime = useCallback(() => {
    setHeld(false);
    setSession(null);
  }, []);

  return (
    <NotebookAiSessionContext.Provider value={session}>
      {held ? (
        <Suspense fallback={null}>
          <NotebookAiSessionBinder
            notebookId={notebookId}
            panelOpen={panelOpen}
            publish={publish}
            onRelease={releaseRuntime}
          />
        </Suspense>
      ) : null}
      {children}
    </NotebookAiSessionContext.Provider>
  );
}
