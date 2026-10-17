import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/sections/shortcutConflict.tsx#localMessages:1">`
zh-Hans:
  sidebarShortcut_2aa4: "侧栏快捷键"
  aiAssistantShortcut_8ea1: "AI 助手快捷键"
  searchShortcut_3580: "搜索快捷键"
  appearanceShortcut_d567: "外观快捷键"
  backShortcut_47b7: "返回快捷键"
  forwardShortcut_d31e: "前进快捷键"
  newTabShortcut_b5a7: "新建标签页快捷键"
  shortcutConflict_3ff0: "快捷键冲突"
  shortcutInUse: "{{shortcut}} 已被其他操作使用。"
  keyboardShortcuts_f7d2: "快捷键"
  shortcutUpdated: "{{label}}已更新"
  shortcutDisabled: "{{label}}已停用"
en:
  sidebarShortcut_2aa4: "Sidebar shortcut"
  aiAssistantShortcut_8ea1: "AI assistant shortcut"
  searchShortcut_3580: "Search shortcut"
  appearanceShortcut_d567: "Appearance shortcut"
  backShortcut_47b7: "Back shortcut"
  forwardShortcut_d31e: "Forward shortcut"
  newTabShortcut_b5a7: "New tab shortcut"
  shortcutConflict_3ff0: "Shortcut conflict"
  shortcutInUse: "{{shortcut}} is already assigned to another action."
  keyboardShortcuts_f7d2: "Keyboard shortcuts"
  shortcutUpdated: "{{label}} updated"
  shortcutDisabled: "{{label}} disabled"
`;
const uiText = createTranslator(localMessages);
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
  toggleSidebar: uiText("sidebarShortcut_2aa4"),
  toggleAIPanel: uiText("aiAssistantShortcut_8ea1"),
  openSearch: uiText("searchShortcut_3580"),
  toggleTheme: uiText("appearanceShortcut_d567"),
  navBack: uiText("backShortcut_47b7"),
  navForward: uiText("forwardShortcut_d31e"),
  newTab: uiText("newTabShortcut_b5a7"),
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
        toast.warning(uiText("shortcutConflict_3ff0"), {
          description: uiText("shortcutInUse", { shortcut: formatShortcut(shortcut) }),
        });
        return;
      }
    }
    setAppShortcut(id, shortcut);
    const label = APP_SHORTCUT_LABELS[id] ?? uiText("keyboardShortcuts_f7d2");
    toast.success(shortcut ? uiText("shortcutUpdated", { label }) : uiText("shortcutDisabled", { label }), {
      description: shortcut ? formatShortcut(shortcut) : undefined,
    });
  };
}
