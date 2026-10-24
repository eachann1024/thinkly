import { useEffect } from "react";
import { useLocale } from "@/i18n";
import { usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { getPageTitle } from "@/components/editor/utils/page-title";
import {
  TITLE_SYNC_DEBOUNCE_MS,
  getDefaultWindowTitle,
  getWelcomeWindowTitle,
  syncDesktopWindowTitle,
} from "@/lib/electron/windowTitle";

export function useDesktopWindowTitleSync(): void {
  const locale = useLocale();
  const activePageId = usePages((s) => s.activePageId);
  const pageTitle = usePages((s) => {
    const page = activePageId ? s.pages[activePageId] : undefined;
    return page ? getPageTitle(page) : null;
  });
  const isWelcomeTab = useTabs(
    (s) =>
      s.openTabs.find((tab) => tab.id === s.activeTabId)?.type === "welcome",
  );

  useEffect(() => {

    const title =
      pageTitle ?? (isWelcomeTab ? getWelcomeWindowTitle() : getDefaultWindowTitle());
    const timer = window.setTimeout(() => {
      void syncDesktopWindowTitle(title);
    }, TITLE_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pageTitle, isWelcomeTab, locale]);
}
