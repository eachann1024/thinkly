/** 外壳始终包住编辑器。AI 运行时等第一次打开面板再加载，避免启动时解析 SDK。 */
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
  /** 面板当前可见。一旦为真就保持运行时，关闭面板不中止请求。 */
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
