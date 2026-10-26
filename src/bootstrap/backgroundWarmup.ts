import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { warmPinyinMatcher } from "@/lib/pinyin-search";
import { scheduleIdleTask } from "@/lib/scheduleIdleTask";
import { notebookAiPanel, notebookAiSession } from "@/pages/workspace/components/notebook-ai/notebookAiLoader";
import { settingsDialog } from "@/pages/workspace/components/sidebar/settingsDialogLoader";
import { loadSearchSheet } from "@/pages/workspace/components/search-sheet/searchSheetLoader";

export function scheduleBackgroundWarmup(rootElement: HTMLElement) {
  if (rootElement.dataset.entry === "quicknote") return;

  // Only import modules: never mount hidden panels, create conversations, or
  // start model requests just to warm a surface.
  if (useSettings.getState().ai.enabled) {
    scheduleIdleTask(() => notebookAiSession.load(), "AI session preload");
    scheduleIdleTask(() => notebookAiPanel.load(), "AI panel preload");
  }
  scheduleIdleTask(() => settingsDialog.load(), "Settings preload");
  scheduleIdleTask(() => loadSearchSheet(), "Search preload");
  scheduleIdleTask(warmPinyinMatcher, "Pinyin preload");

  for (const notebook of Object.values(useNotebooks.getState().notebooks)) {
    if (notebook.source !== "local-folder" || !notebook.localPath || notebook.localPathMissing) continue;
    scheduleIdleTask(async () => {
      // The active folder was already scanned during startup. Recheck at run
      // time because navigation/deletion may happen while this job is queued.
      const state = useNotebooks.getState();
      const current = state.notebooks[notebook.id];
      const status = state.localFolderLoadStates[notebook.id]?.status;
      if (!current?.localPath || current.localPathMissing || status === "ready" || status === "loading") return;
      await usePages.getState().loadLocalFolderPages(current.id, current.localPath);
    }, "Local folder preload");
  }
  scheduleIdleTask(async () => {
    const { triggerAutoWebdavBackup } = await import("@/lib/webdavSync");
    await triggerAutoWebdavBackup();
  }, "WebDAV backup");
}
