import { useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import {
  normalizeHiddenCodePreviewSelection,
  registerHiddenCodePreview,
} from "../../extensions/hiddenCodePreviewSelection";

type PreviewEditor = { prosemirrorState: EditorState; prosemirrorView: EditorView };

export function useCodePreviewSelection(
  editor: PreviewEditor,
  id: string,
  sourceHidden: boolean,
  setPreviewMode: (mode: "code" | "preview") => void,
) {
  useLayoutEffect(() => {
    if (!sourceHidden) return;
    const unregister = registerHiddenCodePreview(editor, id, () => {
      flushSync(() => setPreviewMode("code"));
    });
    // Switching the toolbar to preview can hide the current text selection too.
    const tr = normalizeHiddenCodePreviewSelection(editor, editor.prosemirrorState);
    if (tr) editor.prosemirrorView.dispatch(tr);
    return unregister;
  }, [editor, id, sourceHidden, setPreviewMode]);
}
