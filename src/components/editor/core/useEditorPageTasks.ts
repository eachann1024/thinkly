import { useLayoutEffect, useMemo, useRef } from "react";
import type { EditorRuntime } from "./useEditorSession";

export function useEditorPageTasks(
  { editor, activePageId, pageRef }: EditorRuntime,
  enabled = true,
) {
  const readyRef = useRef(false);
  const enabledRef = useRef(enabled);

  const tasks = useMemo(() => {
    const pending = new Set<() => void>();
    const schedule = (
      callback: () => void,
      request: (run: () => void) => number,
      cancelRequest: (id: number) => void,
    ) => {
      const pageId = pageRef.current?.id;
      if (!readyRef.current || !enabledRef.current || !pageId) return () => {};
      const id = request(() => {
        pending.delete(cancel);
        if (
          readyRef.current && enabledRef.current &&
          pageRef.current?.id === pageId && !editor._tiptapEditor.isDestroyed
        ) callback();
      });
      const cancel = () => {
        cancelRequest(id);
        pending.delete(cancel);
      };
      pending.add(cancel);
      return cancel;
    };
    return {
      frame: (callback: () => void) => schedule(
        callback, (run) => window.requestAnimationFrame(run),
        (id) => window.cancelAnimationFrame(id),
      ),
      timeout: (callback: () => void) => schedule(
        callback, (run) => window.setTimeout(run, 0),
        (id) => window.clearTimeout(id),
      ),
      cancel: () => {
        for (const cancel of pending) cancel();
      },
    };
  }, [editor, pageRef]);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    readyRef.current = true;
    return () => {
      readyRef.current = false;
      tasks.cancel();
    };
  }, [activePageId, enabled, tasks]);

  return tasks;
}
