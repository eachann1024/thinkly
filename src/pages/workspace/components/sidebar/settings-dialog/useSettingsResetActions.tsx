import { useSettings } from "@/stores/useSettings";
import {
  QUICKNOTE_DEFAULT_HEIGHT,
  QUICKNOTE_DEFAULT_WIDTH,
  createEmptyQuickNoteDrafts,
  useQuickNote,
} from "@/stores/useQuickNote";
import { createEmptySlotStacks } from "@/lib/quicknote/undoHistory";
import { useSidebarView } from "@/stores/useSidebarView";
import { AI_INITIAL_STATE } from "@/stores/settings/slices/aiSlice";
import { APPEARANCE_INITIAL_STATE } from "@/stores/settings/slices/appearanceSlice";
import { LOCAL_FOLDER_INITIAL_STATE } from "@/stores/settings/slices/localFolderSlice";
import { SEARCH_PROVIDERS_INITIAL_STATE } from "@/stores/settings/slices/searchProvidersSlice";
import { SHORTCUTS_INITIAL_STATE } from "@/stores/settings/slices/shortcutsSlice";
import { WEBDAV_INITIAL_STATE } from "@/stores/settings/slices/webdavSlice";
import { toast } from "@/components/ui/sonner";
import type { useSettingsBackupRestore } from "./useSettingsBackupRestore";

export function useSettingsResetActions(
  input: ReturnType<typeof useSettingsBackupRestore>,
) {
  const {
    onOpenChange,
    setTheme,
    accentColor,
    setAccentColor,
    sendDataEvent,
    beginDataOperation,
    canReset,
    clearCurrentContent,
    createDefaultNotebook,
    restoreBackupWithRollback,
  } = input;

  const resetSettingsToDefaults = async () => {
    await useSettings.persist.clearStorage();
    useSettings.setState({
      ...structuredClone(AI_INITIAL_STATE),
      ...structuredClone(APPEARANCE_INITIAL_STATE),
      ...structuredClone(LOCAL_FOLDER_INITIAL_STATE),
      ...structuredClone(SEARCH_PROVIDERS_INITIAL_STATE),
      ...structuredClone(SHORTCUTS_INITIAL_STATE),
      ...structuredClone(WEBDAV_INITIAL_STATE),
      _hasHydrated: true,
    });
    useSettings.getState().setTheme("system");
    useSettings.getState().setAccentColor(APPEARANCE_INITIAL_STATE.accentColor);
  };

  const resetAuxiliaryAppState = () => {
    useQuickNote.persist.clearStorage();
    useQuickNote.setState({
      activeSlot: 1,
      drafts: createEmptyQuickNoteDrafts(),
      undoStacks: createEmptySlotStacks(),
      redoStacks: createEmptySlotStacks(),
      pinned: true,
      editorZoom: 1,
      windowWidth: QUICKNOTE_DEFAULT_WIDTH,
      windowHeight: QUICKNOTE_DEFAULT_HEIGHT,
      windowX: undefined,
      windowY: undefined,
    });

    useSidebarView.persist.clearStorage();
    useSidebarView.setState({
      expandedByNotebook: {},
      focusedByNotebook: {},
      selectedByNotebook: {},
      favoritesCollapsed: false,
      sidebarCollapsed: false,
    });

    [
      "goose-recent-excludes",
      "goose-note-ai-panel-open",
      "goose-note-ai-panel-width",
      "sidebar-width",
      "settings-sidebar-width",
    ].forEach((key) => window.localStorage.removeItem(key));
  };

  const handleManualReset = async () => {
    if (!canReset) return;
    const id = beginDataOperation("reset");
    if (id === null) return;
    try {
      await clearCurrentContent();
      createDefaultNotebook();
      await resetSettingsToDefaults();
      resetAuxiliaryAppState();
      sendDataEvent({ type: "reset.closed" });
      onOpenChange(false);
      toast.success("重置成功");
    } catch (error) {
      console.error("Reset failed", error);
      toast.error("重置失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      sendDataEvent({ type: "reset.finished", id });
    }
  };

  const handleReset = async (zipBlob?: Blob) => {
    if (!zipBlob) return handleManualReset();
    const id = beginDataOperation("restore");
    if (id === null) throw new Error("正在重置或恢复数据，请稍后重试");
    try {
      await restoreBackupWithRollback(zipBlob);
    } finally {
      sendDataEvent({ type: "restore.finished", id });
    }
  };

  return {
    ...input,
    resetSettingsToDefaults,
    resetAuxiliaryAppState,
    handleReset,
    handleManualReset,
  };
}
