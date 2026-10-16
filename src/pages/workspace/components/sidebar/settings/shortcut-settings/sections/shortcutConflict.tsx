import { toast } from "@/components/ui/sonner";
import { formatShortcut, isMacPlatform, type PlatformKind } from "@/lib/utils";
import { normalizeShortcutForConflict } from "@/lib/shortcut-platform";
import { NON_CUSTOMIZABLE_APP_SHORTCUT_IDS } from "@/lib/fixed-app-shortcuts";
import {
  TAB_ONLY_APP_SHORTCUT_IDS,
  ALWAYS_FIXED_SHORTCUT_VALUES,
  FIXED_SHORTCUT_VALUES,
} from "./shortcutConfig";

export // Collect all currently configured shortcuts to detect conflicts
// eslint-disable-next-line react-refresh/only-export-components
function getAllConfiguredShortcuts(
  appShortcuts: Record<string, string>,
  _closeTabShortcut: string,
  _searchPanelCloseShortcut: string,
  excludeId: string,
  isMac: PlatformKind | boolean = isMacPlatform(),
  singleTabMode = false,
  desktopHotkeys?: {
    wakeHotkey?: string;
    quicknoteHotkey?: string;
    searchHotkey?: string;
  },
): string[] {
  const fixedValues = singleTabMode
    ? ALWAYS_FIXED_SHORTCUT_VALUES
    : FIXED_SHORTCUT_VALUES;
  const shortcuts = fixedValues.map((shortcut) =>
    normalizeShortcutForConflict(shortcut, isMac),
  );
  for (const [id, s] of Object.entries(appShortcuts)) {
    if (id === excludeId || !s || NON_CUSTOMIZABLE_APP_SHORTCUT_IDS.has(id))
      continue;
    // 单标签模式下这些动作不注册热键，也不应占用可配置位。
    if (singleTabMode && TAB_ONLY_APP_SHORTCUT_IDS.has(id)) continue;
    shortcuts.push(normalizeShortcutForConflict(s, isMac));
  }
  // 桌面全局快捷键（Electron）也参与冲突占用。
  if (excludeId !== "wake-hotkey" && desktopHotkeys?.wakeHotkey) {
    shortcuts.push(
      normalizeShortcutForConflict(desktopHotkeys.wakeHotkey, isMac),
    );
  }
  if (excludeId !== "quicknote-hotkey" && desktopHotkeys?.quicknoteHotkey) {
    shortcuts.push(
      normalizeShortcutForConflict(desktopHotkeys.quicknoteHotkey, isMac),
    );
  }
  if (excludeId !== "search-hotkey" && desktopHotkeys?.searchHotkey) {
    shortcuts.push(
      normalizeShortcutForConflict(desktopHotkeys.searchHotkey, isMac),
    );
  }
  return shortcuts;
}

const APP_SHORTCUT_LABELS: Record<string, string> = {
  toggleSidebar: "侧栏快捷键",
  toggleAIPanel: "AI 助手快捷键",
  openSearch: "搜索快捷键",
  toggleTheme: "外观快捷键",
  navBack: "返回快捷键",
  navForward: "前进快捷键",
  newTab: "新建标签页快捷键",
};

export function makeAppShortcutSetter(
  id: string,
  setAppShortcut: (id: string, shortcut: string) => void,
  appShortcuts: Record<string, string>,
  closeTabShortcut: string,
  searchPanelCloseShortcut: string,
  singleTabMode: boolean,
  desktopHotkeys?: {
    wakeHotkey?: string;
    quicknoteHotkey?: string;
    searchHotkey?: string;
  },
) {
  return (shortcut: string) => {
    if (shortcut) {
      const existing = getAllConfiguredShortcuts(
        appShortcuts,
        closeTabShortcut,
        searchPanelCloseShortcut,
        id,
        isMacPlatform(),
        singleTabMode,
        desktopHotkeys,
      );
      if (existing.includes(normalizeShortcutForConflict(shortcut))) {
        toast.warning("快捷键冲突", {
          description: `${formatShortcut(shortcut)} 已被其他操作使用。`,
        });
        return;
      }
    }
    setAppShortcut(id, shortcut);
    const label = APP_SHORTCUT_LABELS[id] ?? "快捷键";
    toast.success(shortcut ? `${label}已更新` : `${label}已停用`, {
      description: shortcut ? formatShortcut(shortcut) : undefined,
    });
  };
}
