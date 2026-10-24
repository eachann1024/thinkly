import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/useShortcutSettings.tsx#localMessages:1">`
zh-Hans:
  defaultShortcutsRestored_9e68: "已恢复默认快捷键"
en:
  defaultShortcutsRestored_9e68: "Default shortcuts restored"
ja:
  defaultShortcutsRestored_9e68: "デフォルトのショートカットに戻しました"
`;
const uiText = createTranslator(localMessages);
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  DEFAULT_CLOSE_TAB_SHORTCUT,
  DEFAULT_SEARCH_PANEL_CLOSE_SHORTCUT,
  DEFAULT_WAKE_HOTKEY,
  DEFAULT_QUICKNOTE_HOTKEY,
  DEFAULT_SEARCH_HOTKEY,
  useSettings,
} from "@/stores/useSettings";
import {
  type SettingsShortcutsProps,
  makeAppShortcutSetter,
} from "./shared";

export function useShortcutSettings({
  closeTabShortcut,
  setCloseTabShortcut,
  searchPanelCloseShortcut,
  setSearchPanelCloseShortcut,
  appShortcuts,
  setAppShortcut,
  resetAppShortcuts,
  singleTabMode,
}: SettingsShortcutsProps) {
  useLocale();
  const [confirmReset, setConfirmReset] = useState(false);

  const wakeHotkey = useSettings((s) => s.desktop.wakeHotkey);

  const quicknoteHotkey = useSettings((s) => s.desktop.quicknoteHotkey);

  const searchHotkey = useSettings((s) => s.desktop.searchHotkey);

  const desktopHotkeys = { wakeHotkey, quicknoteHotkey, searchHotkey };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetAppShortcuts();
    setCloseTabShortcut(DEFAULT_CLOSE_TAB_SHORTCUT);
    setSearchPanelCloseShortcut(DEFAULT_SEARCH_PANEL_CLOSE_SHORTCUT);
    const settings = useSettings.getState();
    settings.setWakeHotkey(DEFAULT_WAKE_HOTKEY);
    settings.setWakeHotkeyEnabled(true);
    settings.setQuicknoteHotkey(DEFAULT_QUICKNOTE_HOTKEY);
    settings.setQuicknoteHotkeyEnabled(true);
    settings.setSearchHotkey(DEFAULT_SEARCH_HOTKEY);
    settings.setSearchHotkeyEnabled(true);
    setConfirmReset(false);
    toast.success(uiText("defaultShortcutsRestored_9e68"));
  };

  const safeSetAppShortcut = (id: string) =>
    makeAppShortcutSetter(
      id,
      setAppShortcut,
      appShortcuts,
      closeTabShortcut,
      searchPanelCloseShortcut,
      singleTabMode,
      desktopHotkeys,
    );
  return {
    closeTabShortcut,
    setCloseTabShortcut,
    searchPanelCloseShortcut,
    setSearchPanelCloseShortcut,
    appShortcuts,
    setAppShortcut,
    resetAppShortcuts,
    singleTabMode,
    confirmReset,
    setConfirmReset,
    wakeHotkey,
    quicknoteHotkey,
    searchHotkey,
    desktopHotkeys,
    handleReset,
    safeSetAppShortcut,
  };
}
