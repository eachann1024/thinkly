import { useEffect } from "react";
import type { EditorRuntime } from "./useEditorSession";
import { scrollToEditorLinkAnchor, subscribeEditorLinkAnchor, takeEditorLinkAnchor } from "../utils/editorLinkAnchor";
import { reportEditorLinkFailure } from "../utils/openEditorLink";

export function useEditorLinkAnchor({ editor, activePageId }: EditorRuntime, isActiveEditor: boolean) {
  useEffect(() => {
    if (!isActiveEditor || !activePageId) return;
    let frame = 0;
    const navigate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const fragment = takeEditorLinkAnchor(activePageId);
          if (fragment !== null && !scrollToEditorLinkAnchor(editor, fragment)) reportEditorLinkFailure();
        });
      });
    };
    const unsubscribe = subscribeEditorLinkAnchor(navigate);
    navigate();
    return () => { cancelAnimationFrame(frame); unsubscribe(); };
  }, [editor, activePageId, isActiveEditor]);
}
