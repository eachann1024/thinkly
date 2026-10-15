import { useCallback, useEffect, useRef, useState } from "react";
import { TextSelection } from "prosemirror-state";
import { setFakeSelection } from "@/components/editor/extensions/fakeSelectionExtension";
import {
  restoreSelectionAfterFormat,
  snapshotCurrentSelection,
  withPreservedSelection,
} from "./selectionRestore";

export type SelectionMenuChange = (id: string, open: boolean) => void;
export type RunToolbarAction = (apply: () => void) => void;

export function useSelectionMenu(
  editor: Parameters<typeof snapshotCurrentSelection>[0],
  id: string,
  onOpenChange?: SelectionMenuChange,
) {
  const [open, setOpenState] = useState(false);
  const held = useRef<ReturnType<typeof snapshotCurrentSelection> | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        held.current = snapshotCurrentSelection(editor);
        const { selection } = editor.prosemirrorState;
        if (selection instanceof TextSelection && !selection.empty) {
          setFakeSelection(editor, { from: selection.from, to: selection.to });
        }
      } else {
        held.current = null;
        setFakeSelection(editor, null);
      }
      setOpenState(next);
      onOpenChange?.(id, next);
    },
    [editor, id, onOpenChange],
  );

  const runAction = useCallback<RunToolbarAction>(
    (apply) => {
      const snapshot = held.current;
      const focused = document.activeElement;
      if (snapshot) restoreSelectionAfterFormat(editor, snapshot);
      withPreservedSelection(editor, apply);
      if (snapshot) held.current = snapshotCurrentSelection(editor);
      if (focused instanceof HTMLElement && focused.isConnected &&
        focused.closest("[data-goose-floating-content]")) {
        focused.focus({ preventScroll: true });
      }
    },
    [editor],
  );

  useEffect(
    () => () => {
      onOpenChange?.(id, false);
      if (held.current) setFakeSelection(editor, null);
    },
    [editor, id, onOpenChange],
  );

  return { open, setOpen, runAction };
}
