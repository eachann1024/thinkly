import { useEffect } from "react";
import {
  useQuickNote,
  clampQuickNoteZoom,
  QUICKNOTE_ZOOM_STEP,
} from "@/stores/useQuickNote";
import {
  getQuickNoteSlotShortcut,
  getQuickNoteWorkspaceAction,
  shouldQuickNoteEditableTargetOwnShortcut,
} from "../quickNoteShortcuts";
import { showDesktopMainWindow } from "@/lib/electron/windowToggle";
import { getFixedAppShortcuts } from "@/lib/fixed-app-shortcuts";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { useSettings } from "@/stores/settings";
import type { useQuickNoteSaveActions } from "./useQuickNoteSaveActions";

export function useQuickNoteShortcuts(
  input: ReturnType<typeof useQuickNoteSaveActions>,
) {
  const {
    setEditorZoom,
    handleUndo,
    handleRedo,
    handleSwitchSlot,
    persistPlacementThenClose,
  } = input;


  useEffect(() => {
    const onShortcutKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isImeKeyboardEvent(e)) return;
      if (e.key === "Escape") return;
      if (
        shouldQuickNoteEditableTargetOwnShortcut(e.target as HTMLElement | null)
      ) {
        return;
      }

      const shortcutSlot = getQuickNoteSlotShortcut(e);
      if (shortcutSlot !== null) {
        e.preventDefault();
        e.stopPropagation();
        handleSwitchSlot(shortcutSlot, "shortcut");
        return;
      }

      const appShortcuts = useSettings.getState().appShortcuts;
      const workspaceAction = getQuickNoteWorkspaceAction(e, {
        openSearch: appShortcuts.openSearch,
        openSettings: getFixedAppShortcuts().openSettings,
        toggleAIPanel: appShortcuts.toggleAIPanel,
        newNote: getFixedAppShortcuts().newNote,
      });
      if (workspaceAction) {
        e.preventDefault();
        e.stopPropagation();
        void showDesktopMainWindow(workspaceAction);
        return;
      }

      if (!isPlatformPrimaryModifierEvent(e) || e.altKey) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (key === "z") {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (key === "y" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setEditorZoom(
          clampQuickNoteZoom(
            useQuickNote.getState().editorZoom + QUICKNOTE_ZOOM_STEP,
          ),
        );
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setEditorZoom(
          clampQuickNoteZoom(
            useQuickNote.getState().editorZoom - QUICKNOTE_ZOOM_STEP,
          ),
        );
      } else if (e.key === "0") {
        e.preventDefault();
        setEditorZoom(1);
      }
    };
    const onEscapeKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isImeKeyboardEvent(e)) {
        return;
      }
      e.preventDefault();
      persistPlacementThenClose();
    };

    window.addEventListener("keydown", onShortcutKeyDown, true);
    window.addEventListener("keydown", onEscapeKeyDown);
    return () => {
      window.removeEventListener("keydown", onShortcutKeyDown, true);
      window.removeEventListener("keydown", onEscapeKeyDown);
    };
  }, [
    handleSwitchSlot,
    handleUndo,
    handleRedo,
    persistPlacementThenClose,
    setEditorZoom,
  ]);
  return { ...input };
}
