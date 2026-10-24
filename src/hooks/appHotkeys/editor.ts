import { useSettings, EDITOR_FONT_SIZE_DEFAULT } from "@/stores/useSettings";
import { useSidebarView } from "@/stores/useSidebarView";
import { closeAllOverlays } from "@/lib/closeAllOverlays";
import { matchShortcut } from "@/lib/shortcut-match";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { isWorkspaceSettingsOpen } from "@/lib/settings-navigation";
import { readSearchSelection } from "@/pages/workspace/components/sidebar/readSearchSelection";
import type { HotkeyEntry } from "./types";
import type { AppHotkeyActions } from "./actions";

export function createEditorHotkeys(actions: AppHotkeyActions): HotkeyEntry[] {
  const {
    appShortcutsRef,
    fixedShortcuts,
    isZoomInKey,
    isZoomOutKey,
    isZoomResetKey,
    hasPrimaryModifier,
    matchesConfiguredShortcut,
  } = actions;
  return [
    {
      id: "find-nav-f3",
      allowRepeat: true,
      match: (event) => event.key === "F3",
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("goose-note:editor-find-nav", {
            detail: { direction: event.shiftKey ? -1 : 1 },
          }),
        );
      },
    },
    {
      id: "open-settings",
      match: (event) => {
        if (event.repeat) return false;
        const key =
          event.key === "，" || event.code === "Comma" ? "," : event.key;
        return matchShortcut(
          {
            key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
          } as KeyboardEvent,
          fixedShortcuts.openSettings,
        );
      },
      handler: (event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("goose-note:open-settings"));
      },
    },
    {
      id: "open-search",
      shortcutId: "openSearch",
      match: (event) => {
        const s = appShortcutsRef.current.openSearch;
        return !!s && matchesConfiguredShortcut(event, s);
      },
      handler: (event) => {
        event.preventDefault();
        const selectionQuery = readSearchSelection();
        closeAllOverlays();
        window.dispatchEvent(new CustomEvent("goose-note:open-search", {
          detail: { selectionQuery },
        }));
      },
    },
    {
      id: "toggle-ai-panel",
      shortcutId: "toggleAIPanel",
      match: (event) => {
        const s = appShortcutsRef.current.toggleAIPanel;
        return !!s && matchesConfiguredShortcut(event, s);
      },
      handler: (event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("goose-note:toggle-ai-panel"));
      },
    },
    {
      id: "toggle-sidebar",
      shortcutId: "toggleSidebar",
      match: (event) => {
        const s = appShortcutsRef.current.toggleSidebar;
        return !!s && matchesConfiguredShortcut(event, s);
      },
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isWorkspaceSettingsOpen())
          window.dispatchEvent(
            new CustomEvent("goose-note:toggle-settings-sidebar"),
          );
        else useSidebarView.getState().toggleSidebarCollapsed();
      },
    },
    {
      id: "editor-find-open",
      match: (event) =>
        matchesConfiguredShortcut(event, fixedShortcuts.editorFindOpen),
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("goose-note:editor-find-open"));
      },
    },
    {
      id: "editor-find-replace-open",
      match: (event) => matchShortcut(event, "Mod+Alt+F"),
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("goose-note:editor-find-open", {
            detail: { replace: true },
          }),
        );
      },
    },
    {
      id: "editor-find-nav-g",
      allowRepeat: true,
      match: (event) =>
        isPlatformPrimaryModifierEvent(event) &&
        !event.altKey &&
        event.key.toLowerCase() === "g",
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("goose-note:editor-find-nav", {
            detail: { direction: event.shiftKey ? -1 : 1 },
          }),
        );
      },
    },
    {
      id: "zoom-in",
      match: (event) => hasPrimaryModifier(event) && isZoomInKey(event),
      handler: (event) => {
        event.preventDefault();
        useSettings.getState().increaseEditorFontSize();
      },
    },
    {
      id: "zoom-out",
      match: (event) => hasPrimaryModifier(event) && isZoomOutKey(event),
      handler: (event) => {
        event.preventDefault();
        useSettings.getState().decreaseEditorFontSize();
      },
    },
    {
      id: "zoom-reset",
      match: (event) => hasPrimaryModifier(event) && isZoomResetKey(event),
      handler: (event) => {
        event.preventDefault();
        useSettings.getState().setEditorFontSize(EDITOR_FONT_SIZE_DEFAULT);
      },
    },
  ];
}
