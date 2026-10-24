import { useEffect, useLayoutEffect, useRef, type Dispatch, type RefObject } from "react";
import { readEditorFindSeed } from "@/components/editor/find/findSeed";
import { closeAllOverlays } from "@/lib/closeAllOverlays";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";

import type { EditorOverlayEvent } from "./editorOverlayState";

type OverlayEvents = {
  editor: Parameters<typeof readEditorFindSeed>[0];
  editorContainerRef: RefObject<HTMLDivElement | null>;
  isActiveEditor: boolean;
  pageId: string;
  dispatch: Dispatch<EditorOverlayEvent>;
};

export function useEditorOverlayEvents({
  editor, editorContainerRef, isActiveEditor, pageId,
  dispatch,
}: OverlayEvents) {
  const requestNonce = useRef(0);
  useLayoutEffect(() => {
    dispatch({ type: "owner-changed" });
  }, [isActiveEditor, pageId, dispatch]);

  useEffect(() => {
    if (!isActiveEditor) return;
    let pendingOpen: number | undefined;
    const handleOpenFind = (event: Event) => {
      if (isWorkspaceSettingsOpen()) return;
      const findInputFocused = Boolean(
        document.activeElement?.closest?.("[data-goose-find-in-page]"),
      );
      const seed = findInputFocused
        ? ""
        : readEditorFindSeed(editor, editorContainerRef.current);
      closeAllOverlays();
      const nonce = ++requestNonce.current;
      dispatch({ type: "find-requested", request: {
        seed, replace: (event as CustomEvent<{ replace?: unknown }>).detail?.replace === true, nonce,
      } });
      window.clearTimeout(pendingOpen);
      pendingOpen = window.setTimeout(() => dispatch({ type: "find-opened", nonce }), 0);
    };
    const handleOpenLink = () => {
      if (isWorkspaceSettingsOpen()) return;
      dispatch({ type: "link-opened" });
    };
    const handleCloseLink = () => dispatch({ type: "link-closed" });
    window.addEventListener("goose-note:editor-find-open", handleOpenFind);
    document.addEventListener("goose-open-link-popover", handleOpenLink);
    document.addEventListener("goose-close-link-popover", handleCloseLink);
    return () => {
      window.clearTimeout(pendingOpen);
      window.removeEventListener("goose-note:editor-find-open", handleOpenFind);
      document.removeEventListener("goose-open-link-popover", handleOpenLink);
      document.removeEventListener("goose-close-link-popover", handleCloseLink);
    };
  }, [
    editor, editorContainerRef, isActiveEditor, pageId,
    dispatch,
  ]);
}
