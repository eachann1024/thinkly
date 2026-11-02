import { useLocale } from "@/i18n";
import { useEffect, useRef } from "react";
import { useSettings } from "@/stores/useSettings";
import { normalizeAppShortcuts } from "@/stores/settings/slices/shortcutsSlice";
import { installAppHotkeyListeners } from "./appHotkeys/listeners";

export function useAppHotkeys() {
  useLocale();
  const appShortcuts = useSettings((state) => state.appShortcuts);

  const appShortcutsRef = useRef(normalizeAppShortcuts(appShortcuts));

  useEffect(() => {
    appShortcutsRef.current = normalizeAppShortcuts(appShortcuts);
  }, [appShortcuts]);

  useEffect(
    () =>
      installAppHotkeyListeners({
        appShortcutsRef,
      }),
    [],
  );
}
