import { useEffect, useLayoutEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import { readEditorFindSeed } from "@/components/editor/find/findSeed";
import { closeAllOverlays } from "@/lib/closeAllOverlays";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";

type OverlayEvents = {
  editor: Parameters<typeof readEditorFindSeed>[0];
  editorContainerRef: RefObject<HTMLDivElement | null>;
  isActiveEditor: boolean;
  pageId: string;
  setFindSeedQuery: Dispatch<SetStateAction<string>>;
  setFindOpenReplace: Dispatch<SetStateAction<boolean>>;
  setFindOpenNonce: Dispatch<SetStateAction<number>>;
  setFindBarOpen: Dispatch<SetStateAction<boolean>>;
  setLinkPopoverUrl: Dispatch<SetStateAction<string>>;
  setLinkPopoverOpen: Dispatch<SetStateAction<boolean>>;
};

/** Global commands belong to the focused pane; pending opens belong to its page. */
export function useEditorOverlayEvents({
  editor, editorContainerRef, isActiveEditor, pageId,
  setFindSeedQuery, setFindOpenReplace, setFindOpenNonce, setFindBarOpen,
  setLinkPopoverUrl, setLinkPopoverOpen,
}: OverlayEvents) {
  useLayoutEffect(() => {
    setFindBarOpen(false);
    setLinkPopoverOpen(false);
  }, [isActiveEditor, pageId, setFindBarOpen, setLinkPopoverOpen]);

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
      setFindSeedQuery(seed);
      setFindOpenReplace(
        (event as CustomEvent<{ replace?: unknown }>).detail?.replace === true,
      );
      setFindOpenNonce((value) => value + 1);
      // Let overlay dismissal finish before opening the find bar.
      window.clearTimeout(pendingOpen);
      pendingOpen = window.setTimeout(() => setFindBarOpen(true), 0);
    };
    const handleOpenLink = () => {
      if (isWorkspaceSettingsOpen()) return;
      setLinkPopoverUrl("");
      setLinkPopoverOpen(true);
    };
    const handleCloseLink = () => setLinkPopoverOpen(false);
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
    setFindSeedQuery, setFindOpenReplace, setFindOpenNonce, setFindBarOpen,
    setLinkPopoverUrl, setLinkPopoverOpen,
  ]);
}
