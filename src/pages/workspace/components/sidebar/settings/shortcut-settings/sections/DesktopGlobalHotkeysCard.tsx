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
        toast.warning("快捷键冲突", {
          description: `${formatShortcut(shortcut)} 已被其他操作使用。`,
        });
        return;
      }
      setHotkey(shortcut);
      setEnabled(true);
    };

  return (
    <SettingsSectionCard title="全局快捷键">
      {macAccessibilityNeeded && (
        <div
          className={`flex items-center justify-between gap-4 p-4 ${SETTINGS_OPTION_ROW_CLASS}`}
        >
          <p className="text-sm leading-relaxed text-foreground">
            允许 Goose Note 使用辅助功能后，才能在其他应用中唤出窗口。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-[var(--goose-control-radius)]"
            onClick={() => {
              void getGooseDesktop()?.requestAccessibility?.();
            }}
          >
            打开辅助功能
          </Button>
        </div>
      )}
      <div className="space-y-3">
        <ShortcutField
          id="wake-hotkey"
          title="唤出主窗口"
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
          title="唤出速记"
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
          title="唤出搜索"
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
