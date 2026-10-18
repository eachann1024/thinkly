import { applyFontVariables } from "@/lib/fontLoader";
import { applyAppearanceScaleVariables } from "@/lib/appearance";
import { migrateLegacyStorage } from "@/lib/storage/migrateLegacyStorage";
import { HostAdapter } from "@/lib/host/adapter";
import { useNotebooks } from "@/stores/useNotebooks";
import { useReflection } from "@/stores/useReflection";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { setupSaveGuards } from "./saveGuards";
import { applyEditorCanvasAttributes } from "@/lib/editorCanvas";
import { installReadOnlyPersistence } from "./readOnlyPersistence";

/**
 * full：主工作区；lean：速记小窗，跳过笔记加载与迁移；
 * search：浮动搜索窗，在 lean 基础上把设置与笔记本持久化改为只读，
 * 页面由搜索面板按需只读扫描本地文件夹得到。
 */
export type BootstrapMode = "full" | "lean" | "search";

export async function initializeApplicationState(
  mode: BootstrapMode,
  beforeInit?: () => Promise<void> | void,
) {
  const lean = mode !== "full";
  await beforeInit?.();
  await HostAdapter.ensureGooseFs();
  if (mode === "search") installReadOnlyPersistence();
  if (!lean) {
    await migrateLegacyStorage();
  }
  await Promise.all([
    useSettings.persist.rehydrate(),
    useNotebooks.persist.rehydrate(),
  ]);
  if (!lean) {
    // NotebookAiChats 持久化 store（skipHydration=true，需手动水合）。主应用 AI 聊天记录，小窗不需要。
    const { useNotebookAiChats } = await import("@/stores/useNotebookAiChats");
    useNotebookAiChats.persist.rehydrate();
    await useReflection.persist.rehydrate();
    // 加载+修复全部笔记（随笔记数线性变慢）；小窗草稿是独立存储，不读 pages。
    await usePages.getState().hydrateFromStorage();
    // Electron 仅本地文件夹模式不会恢复旧内置记事本，因此这些页面不会进入
    // 侧栏或成为活动页；但必须保留在 state 中，供备份链路和「设置 → 本地文件夹」
    // 的显式 Markdown 导出读取。不得在启动时过滤或清除这批升级数据。
    usePages.setState({ activePageId: null, onboardingCompleted: true });
  }
  if (!lean) {
    const nextNotebooksStore = useNotebooks.getState();
    if (
      !nextNotebooksStore.notebooks[nextNotebooksStore.activeNotebookId || ""]
    ) {
      // Electron：无仓库时保持 null（空态），绝不回落 DEFAULT_NOTEBOOK
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
  // 首帧前同步落定界面字号与编辑器缩放：窗口一出现就处于上次状态，
  // 不再先按 100% 布局、等 App effect 再跳回（用户看到的“突兀缩小”）。
  applyAppearanceScaleVariables({
    uiFontSize: settings.uiFontSize,
    editorFontSize: settings.editorFontSize,
    editorLineHeight: settings.editorLineHeight,
  });
  applyEditorCanvasAttributes(settings);
}
