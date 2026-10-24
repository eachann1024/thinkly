import { useLocale } from "@/i18n";
import { useEffect, useRef } from "react";
import { useSettings } from "@/stores/useSettings";
import { useTabs } from "@/stores/useTabs";
import { normalizeAppShortcuts } from "@/stores/settings/slices/shortcutsSlice";
import { installAppHotkeyListeners } from "./appHotkeys/listeners";

export function useAppHotkeys() {
  useLocale();
  const { appShortcuts } = useSettings();

  const { openTabs, activeTabId } = useTabs();

  const appShortcutsRef = useRef(normalizeAppShortcuts(appShortcuts));

  const openTabsRef = useRef(openTabs);

  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    appShortcutsRef.current = normalizeAppShortcuts(appShortcuts);
  }, [appShortcuts]);

  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  useEffect(
    () =>
      installAppHotkeyListeners({
        appShortcutsRef,
        openTabsRef,
        activeTabIdRef,
      }),
    [],
  );
}
