import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings/shortcut-settings/sections/DesktopGlobalHotkeysCard.tsx#localMessages:1">`
zh-Hans:
  shortcutConflict_3ff0: "快捷键冲突"
  shortcutInUse: "{{shortcut}} 已被其他操作使用。"
  globalShortcuts_2205: "全局快捷键"
  allowGooseNoteInAccessibilitySettings_4a8a: "允许思绪 · Thinkly 使用辅助功能后，才能在其他应用中唤出窗口。"
  openAccessibilitySettings_1769: "打开辅助功能"
  showMainWindow_61e7: "唤出主窗口"
  showQuickNote_cd4c: "唤出速记"
  showSearch_c05b: "唤出搜索"
en:
  shortcutConflict_3ff0: "Shortcut conflict"
  shortcutInUse: "{{shortcut}} is already assigned to another action."
  globalShortcuts_2205: "Global shortcuts"
  allowGooseNoteInAccessibilitySettings_4a8a: "Allow Thinkly in Accessibility settings to open its windows from other apps."
  openAccessibilitySettings_1769: "Open Accessibility settings"
  showMainWindow_61e7: "Show main window"
  showQuickNote_cd4c: "Show Quick Note"
  showSearch_c05b: "Show search"
ja:
  shortcutConflict_3ff0: "ショートカットの競合"
  shortcutInUse: "{{shortcut}} は他の操作で使用されています。"
  globalShortcuts_2205: "グローバルショートカット"
  allowGooseNoteInAccessibilitySettings_4a8a: "Thinkly にアクセシビリティの使用を許可すると、他のアプリからウィンドウを呼び出せます。"
  openAccessibilitySettings_1769: "アクセシビリティを開く"
  showMainWindow_61e7: "メインウィンドウを表示"
  showQuickNote_cd4c: "クイックノートを表示"
  showSearch_c05b: "検索を表示"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { formatShortcut, isMacPlatform } from "@/lib/utils";
import { normalizeShortcutForConflict } from "@/lib/shortcut-platform";
import {
  DEFAULT_WAKE_HOTKEY,
  DEFAULT_QUICKNOTE_HOTKEY,
  DEFAULT_SEARCH_HOTKEY,
  useSettings,
} from "@/stores/useSettings";
import { SettingsSectionCard } from "../../SettingsSectionCard";
import { ShortcutField } from "../../ShortcutField";
import { SETTINGS_OPTION_ROW_CLASS } from "./shortcutConfig";
import { getAllConfiguredShortcuts } from "./shortcutConflict";
import { useDesktopHotkeyToasts } from "./useDesktopHotkeyToasts";

export function DesktopGlobalHotkeysCard({
  appShortcuts,
  closeTabShortcut,
  searchPanelCloseShortcut,
  singleTabMode,
}: {
  appShortcuts: Record<string, string>;
  closeTabShortcut: string;
  searchPanelCloseShortcut: string;
  singleTabMode: boolean;
}) {
  useLocale();
  const desktop = useSettings((s) => s.desktop);
  const setWakeHotkey = useSettings((s) => s.setWakeHotkey);
  const setWakeHotkeyEnabled = useSettings((s) => s.setWakeHotkeyEnabled);
  const setQuicknoteHotkey = useSettings((s) => s.setQuicknoteHotkey);
  const setQuicknoteHotkeyEnabled = useSettings(
    (s) => s.setQuicknoteHotkeyEnabled,
  );
  const setSearchHotkey = useSettings((s) => s.setSearchHotkey);
  const setSearchHotkeyEnabled = useSettings((s) => s.setSearchHotkeyEnabled);
  const [macAccessibilityNeeded, setMacAccessibilityNeeded] = useState(false);
  useDesktopHotkeyToasts(true);

  useEffect(() => {
    const api = getGooseDesktop();
    if (!api?.getAccessibilityStatus) return;
    let cancelled = false;
    const refresh = () => {
      void api.getAccessibilityStatus().then((status) => {
        if (cancelled) return;
        setMacAccessibilityNeeded(
          status.platform === "darwin" && !status.trusted,
        );
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const makeDesktopSetter =
    (
      excludeId: "wake-hotkey" | "quicknote-hotkey" | "search-hotkey",
      setHotkey: (shortcut: string) => void,
      setEnabled: (enabled: boolean) => void,
    ) =>
    (shortcut: string) => {
      if (!shortcut) {
        setHotkey("");
        setEnabled(false);
        return;
      }
      const existing = getAllConfiguredShortcuts(
        appShortcuts,
        closeTabShortcut,
        searchPanelCloseShortcut,
        excludeId,
        isMacPlatform(),
        singleTabMode,
        {
          wakeHotkey: desktop.wakeHotkey,
          quicknoteHotkey: desktop.quicknoteHotkey,
          searchHotkey: desktop.searchHotkey,
        },
      );
      if (existing.includes(normalizeShortcutForConflict(shortcut))) {
        toast.warning(uiText("shortcutConflict_3ff0"), {
          description: uiText("shortcutInUse", { shortcut: formatShortcut(shortcut) }),
        });
        return;
      }
      setHotkey(shortcut);
      setEnabled(true);
    };

  return (
    <SettingsSectionCard title={uiText("globalShortcuts_2205")}>
      {macAccessibilityNeeded && (
        <div
          className={`flex items-center justify-between gap-4 ${SETTINGS_OPTION_ROW_CLASS} ${SETTINGS_OPTION_ROW_CLASS}--stack`}
        >
          <p className="text-sm leading-5 text-foreground">
            {uiText("allowGooseNoteInAccessibilitySettings_4a8a")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-[var(--goose-control-radius)]"
            onClick={() => {
              void getGooseDesktop()?.requestAccessibility?.();
            }}
          >
            {uiText("openAccessibilitySettings_1769")}</Button>
        </div>
      )}
      <div className="space-y-3">
        <ShortcutField
          id="wake-hotkey"
          title={uiText("showMainWindow_61e7")}
          value={desktop.wakeHotkeyEnabled ? desktop.wakeHotkey : ""}
          onChange={makeDesktopSetter(
            "wake-hotkey",
            setWakeHotkey,
            setWakeHotkeyEnabled,
          )}
          resetValue={DEFAULT_WAKE_HOTKEY}
        />
        <ShortcutField
          id="quicknote-hotkey"
          title={uiText("showQuickNote_cd4c")}
          value={desktop.quicknoteHotkeyEnabled ? desktop.quicknoteHotkey : ""}
          onChange={makeDesktopSetter(
            "quicknote-hotkey",
            setQuicknoteHotkey,
            setQuicknoteHotkeyEnabled,
          )}
          resetValue={DEFAULT_QUICKNOTE_HOTKEY}
        />
        <ShortcutField
          id="search-hotkey"
          title={uiText("showSearch_c05b")}
          value={desktop.searchHotkeyEnabled ? desktop.searchHotkey : ""}
          onChange={makeDesktopSetter(
            "search-hotkey",
            setSearchHotkey,
            setSearchHotkeyEnabled,
          )}
          resetValue={DEFAULT_SEARCH_HOTKEY}
        />
      </div>
    </SettingsSectionCard>
  );
}
