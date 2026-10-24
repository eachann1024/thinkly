import { applyFontVariables } from "@/lib/fontLoader";
import { applyAppearanceScaleVariables } from "@/lib/appearance";
import { migrateLegacyStorage } from "@/lib/storage/migrateLegacyStorage";
import { migrateStorageNames } from "@/lib/storage/migrateStorageNames";
import { HostAdapter } from "@/lib/host/adapter";
import { useNotebooks } from "@/stores/useNotebooks";
import { useReflection } from "@/stores/useReflection";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { setupSaveGuards } from "./saveGuards";
import { applyEditorCanvasAttributes } from "@/lib/editorCanvas";
import { installReadOnlyPersistence } from "./readOnlyPersistence";

export type BootstrapMode = "full" | "lean" | "search";

export async function initializeApplicationState(
  mode: BootstrapMode,
  beforeInit?: () => Promise<void> | void,
) {
  const lean = mode !== "full";
  if (!lean) await migrateLegacyStorage();
  migrateStorageNames();
  await beforeInit?.();
  await HostAdapter.ensureGooseFs();
  if (mode === "search") installReadOnlyPersistence();
  await Promise.all([
    useSettings.persist.rehydrate(),
    useNotebooks.persist.rehydrate(),
  ]);
  if (!lean) {
    const { getGooseDesktop } = await import("@/lib/electron/runtime");
    const remember = getGooseDesktop()?.gitSync?.rememberNotebookRoot;
    if (remember) {
      await Promise.all(Object.values(useNotebooks.getState().notebooks).map((notebook) => (
        notebook.source === "local-folder" && notebook.localPath
          ? remember(notebook.localPath).catch(() => false)
          : false
      )));
    }
    const { useNotebookAiChats } = await import("@/stores/useNotebookAiChats");
    useNotebookAiChats.persist.rehydrate();
    await useReflection.persist.rehydrate();
    await usePages.getState().hydrateFromStorage();
    usePages.setState({ activePageId: null, onboardingCompleted: true });
  }
  if (!lean) {
    const nextNotebooksStore = useNotebooks.getState();
    if (
      !nextNotebooksStore.notebooks[nextNotebooksStore.activeNotebookId || ""]
    ) {
      const firstNotebookId =
        Object.keys(nextNotebooksStore.notebooks)[0] ?? null;
      useNotebooks.setState({ activeNotebookId: firstNotebookId });
    }
  }
  if (!lean) {
    const { installAssetMaintenanceSnapshotResponder } =
      await import("@/lib/asset-maintenance-snapshot");
    installAssetMaintenanceSnapshotResponder();
    const { installGitSyncResponder } =
      await import("@/lib/git-sync-responder");
    installGitSyncResponder();
    void import("@/lib/history/housekeeping").then((module) => module.scheduleHistoryHousekeeping());
  }
  setupSaveGuards();
  const settings = useSettings.getState();
  applyFontVariables(settings.customFonts, settings);
  applyAppearanceScaleVariables({
    uiFontSize: settings.uiFontSize,
    editorFontSize: settings.editorFontSize,
    editorLineHeight: settings.editorLineHeight,
  });
  applyEditorCanvasAttributes(settings);
}
