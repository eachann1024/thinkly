import { useContext, useEffect, useState } from "react";
import { NotebookAiPanelVisibilityContext } from "../session/context";
import { getNotebookAiPlaceholderHints } from "../session/helpers";

export function useComposerPlaceholder({
  placeholder,
  fallback,
  disabled,
  isStreaming,
  isEmpty,
}: {
  placeholder?: string;
  fallback: string;
  disabled?: boolean;
  isStreaming: boolean;
  isEmpty: boolean;
}) {
  const panelVisible = useContext(NotebookAiPanelVisibilityContext);
  const [index, setIndex] = useState(0);
  const rotate = panelVisible === true && !disabled && !isStreaming && isEmpty &&
    placeholder === undefined;

  useEffect(() => {
    if (!rotate) return;
    let timer: number | null = null;
    const stop = () => {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    };
    const sync = () => {
      if (document.visibilityState !== "visible") {
        stop();
      } else if (timer === null) {
        timer = window.setInterval(() => {
          setIndex((previous) => (previous + 1) % getNotebookAiPlaceholderHints().length);
        }, 4500);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [rotate]);

  return placeholder ?? (panelVisible === null ? fallback : getNotebookAiPlaceholderHints()[index]);
}
