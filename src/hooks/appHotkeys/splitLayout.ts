import { FIXED_SPLIT_SHORTCUTS } from "@/lib/fixed-app-shortcuts";
import { runSplitLayout, swapFocusedSplitPane, toggleFocusedPaneMaximize } from "@/lib/editor-split/layoutCommands";
import type { SplitNeighborDirection } from "@/lib/editor-split/types";
import type { HotkeyEntry } from "./types";
import type { AppHotkeyActions } from "./actions";

const MOVE_SHORTCUTS: Array<[SplitNeighborDirection, keyof typeof FIXED_SPLIT_SHORTCUTS, string]> = [
  ["left", "splitMoveLeft", "split-move-left"],
  ["right", "splitMoveRight", "split-move-right"],
  ["up", "splitMoveUp", "split-move-up"],
  ["down", "splitMoveDown", "split-move-down"],
];

/**
 * 与焦点快捷键一样在 document capture 里 preventDefault。
 * 编辑器的方向键处理发生在更里面的目标阶段，这样带修饰键的方向键不会去移动光标或块。
 */
export function createSplitLayoutHotkeys(actions: AppHotkeyActions): HotkeyEntry[] {
  const { matchesConfiguredShortcut } = actions;
  const moves: HotkeyEntry[] = MOVE_SHORTCUTS.map(([dir, shortcutId, id]) => ({
    id,
    shortcutId,
    match: (event) => {
      const shortcut = FIXED_SPLIT_SHORTCUTS[shortcutId];
      return !!shortcut && matchesConfiguredShortcut(event, shortcut);
    },
    handler: (event) => {
      event.preventDefault();
      event.stopPropagation();
      swapFocusedSplitPane(dir);
    },
  }));
  return [
    ...moves,
    {
      id: "split-equalize",
      shortcutId: "splitEqualize",
      match: (event) => {
        const shortcut = FIXED_SPLIT_SHORTCUTS.splitEqualize;
        return !!shortcut && matchesConfiguredShortcut(event, shortcut);
      },
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        void runSplitLayout("equalize");
      },
    },
    {
      id: "split-maximize",
      shortcutId: "splitMaximize",
      match: (event) => {
        const shortcut = FIXED_SPLIT_SHORTCUTS.splitMaximize;
        return !!shortcut && matchesConfiguredShortcut(event, shortcut);
      },
      handler: (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFocusedPaneMaximize();
      },
    },
  ];
}
