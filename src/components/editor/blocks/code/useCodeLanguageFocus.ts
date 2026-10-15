import { useRef } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import type { SelectionBookmark } from "prosemirror-state";

export function useCodeLanguageFocus() {
  const editor = useBlockNoteEditor();
  const savedSelection = useRef<SelectionBookmark | null>(null);
  return {
    capture() {
      savedSelection.current = editor.prosemirrorState.selection.getBookmark();
    },
    cancel() {
      savedSelection.current = null;
    },
    restore() {
      const bookmark = savedSelection.current;
      savedSelection.current = null;
      if (!bookmark) return;
      const view = editor.prosemirrorView;
      view.dispatch(
        view.state.tr
          .setSelection(bookmark.resolve(view.state.doc))
          .setMeta("addToHistory", false),
      );
      view.focus();
    },
  };
}
