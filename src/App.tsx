import { useLocale } from "@/i18n";
import { SetupGuide } from "@/pages/workspace/components/SetupGuide";
import { CharacterOnboarding } from "@/pages/workspace/components/character-onboarding/CharacterOnboarding";
import { firstRunSurface } from "@/lib/characterGuide";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { applyEditorCanvasAttributes } from "@/lib/editorCanvas";
import { WorkspacePage } from "./pages/workspace/WorkspacePage";
import { Toaster } from "@/components/ui/sonner";
import { usePages } from "./stores/usePages";
import { useTabs } from "./stores/useTabs";
import { useSettings } from "@/stores/useSettings";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { useDesktopHotkeys } from "./hooks/useDesktopHotkeys";
import { useDesktopFileEvents } from "./hooks/useDesktopFileEvents";
import { useNativeContextMenuGuard } from "./hooks/useNativeContextMenuGuard";
import {
  applyAppearanceScaleVariables,
  releaseStartupSettlingAfterPaint,
} from "@/lib/appearance";
import { shouldPreserveStartupSelection } from "@/lib/workspaceStartup";
import { PencilIconDefinitions } from "@/components/theme/PencilIconDefinitions";
import { AppUpdateDialog } from "@/components/app-update/AppUpdateDialog";

function AppearanceSync() {
  const {
    uiFontSize, editorFontSize, editorLineHeight,
    customFonts, uiFontFamily, editorGridMode,
  } = useSettings(useShallow((state) => ({
      uiFontSize: state.uiFontSize,
      editorFontSize: state.editorFontSize,
      editorLineHeight: state.editorLineHeight,
      customFonts: state.customFonts,
      uiFontFamily: state.uiFontFamily,
      editorGridMode: state.editorGridMode,
    })));
  useEffect(() => {
    applyAppearanceScaleVariables({ uiFontSize, editorFontSize, editorLineHeight });
  }, [uiFontSize, editorFontSize, editorLineHeight]);

  useEffect(() => {
    applyFontVariables(customFonts, { uiFontFamily });
  }, [customFonts, uiFontFamily]);

  useEffect(() => {
    applyEditorCanvasAttributes({ editorGridMode });
  }, [editorGridMode]);

  return null;
}

function App() {
  useLocale();
  const settingsHydrated = useSettings((state) => state._hasHydrated);
  const surface = useSettings(firstRunSurface);
  const guideVisible = surface !== "app";
  const [workspaceOpened, setWorkspaceOpened] = useState(false);
  const mountWorkspace = workspaceOpened || (settingsHydrated && !guideVisible);

  useEffect(() => {
    if (settingsHydrated && !guideVisible) setWorkspaceOpened(true);
  }, [settingsHydrated, guideVisible]);
  const privacy = useSettings((state) => state.privacy);
  const singleTabModeSetting = useSettings((state) => state.singleTabMode);
  const hydrated = usePages((s) => s.hydrated);
  const activePageId = usePages((s) => s.activePageId);

  useAppHotkeys();

  useDesktopHotkeys();

  useNativeContextMenuGuard();

  const { restoreLastNoteIfNeeded, clearActivePageForBlankEntry } = useDesktopFileEvents();

  useEffect(() => {
    releaseStartupSettlingAfterPaint();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const tabsStore = useTabs.getState();

    tabsStore.reconcileTabs();

    const { activePageId, pages } = usePages.getState();
    if (
      activePageId &&
      useTabs.getState().openTabs.length === 0 &&
      pages[activePageId]
    ) {
      useTabs.getState().openTab(activePageId);
    }
  }, [hydrated, activePageId]);

  useEffect(() => {
    if (!hydrated) return;

    const { privacy } = useSettings.getState();
    if (shouldPreserveStartupSelection()) return;

    if (!privacy.autoOpenLastNote) {
      clearActivePageForBlankEntry();
      return;
    }

    restoreLastNoteIfNeeded();
  }, [hydrated, restoreLastNoteIfNeeded, clearActivePageForBlankEntry]);

  useEffect(() => {
    if (!hydrated || !privacy.autoCloseInactiveTabs) return;

    const closeExpiredTabs = () => {
      useTabs.getState().closeExpiredTabs();
    };

    closeExpiredTabs();
    const timer = window.setInterval(closeExpiredTabs, 15 * 60 * 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [
    hydrated,
    privacy.autoCloseInactiveTabs,
    privacy.autoCloseInactiveTabsHours,
  ]);

  useEffect(() => {
    if (!hydrated || !effectiveSingleTabMode(singleTabModeSetting)) return;
    useTabs.getState().collapseToActiveTab();
  }, [hydrated, singleTabModeSetting]);

  return (
    <>
      <AppearanceSync />
      <PencilIconDefinitions />
      {mountWorkspace && (
        <div hidden={guideVisible} inert={guideVisible} className="h-full">
          { }
          <WorkspacePage />
        </div>
      )}
      {surface === "character" && <CharacterOnboarding />}
      {surface === "setup" && <SetupGuide />}
      <AppUpdateDialog />
      <Toaster />
    </>
  );
}

export default App;
