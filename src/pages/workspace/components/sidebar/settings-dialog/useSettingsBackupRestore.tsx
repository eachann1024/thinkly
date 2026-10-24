import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/settings-dialog/useSettingsBackupRestore.tsx#localMessages:1">`
zh-Hans:
  theBackupContainsNoNotebooksTo_ad6c: "备份中没有可恢复的笔记本"
  restoreFailedAndAutomaticRollbackDid_84d4: "恢复失败，且自动回滚未完成，请从本地导出备份恢复"
  restoreFailedYourPreviousDataWas_dcd9: "恢复失败，已自动恢复覆盖前的数据"
  restoredAndSynced_ea35: "恢复并同步成功"
en:
  theBackupContainsNoNotebooksTo_ad6c: "The backup contains no notebooks to restore"
  restoreFailedAndAutomaticRollbackDid_84d4: "Restore failed and automatic rollback did not finish. Restore from a local exported backup."
  restoreFailedYourPreviousDataWas_dcd9: "Restore failed. Your previous data was restored automatically."
  restoredAndSynced_ea35: "Restored and synced"
ja:
  theBackupContainsNoNotebooksTo_ad6c: "バックアップに復元できるノートブックがありません"
  restoreFailedAndAutomaticRollbackDid_84d4: "復元に失敗し、自動ロールバックも完了しませんでした。ローカルにエクスポートしたバックアップから復元してください。"
  restoreFailedYourPreviousDataWas_dcd9: "復元に失敗したため、復元前のデータを自動的に元に戻しました。"
  restoredAndSynced_ea35: "復元と同期が完了しました"
`;
const uiText = createTranslator(localMessages);
import { useNotebooks } from "@/stores/useNotebooks";
import { clearLocalPageMetadataCache, usePages } from "@/stores/usePages";
import { useTabs } from "@/stores/useTabs";
import { useNotebookAiChats } from "@/stores/useNotebookAiChats";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";
import {
  clearPersistedInternalPages,
  clearPersistedPages,
} from "@/lib/storage/pageRepository";
import { clearLegacyStorage } from "@/lib/storage/migrateLegacyStorage";
import { historyRepository } from "@/lib/history/repository";
import { clearAllLocalMdSnapshots } from "@/lib/local-md-snapshot";
import { removeLocalPageIdMap } from "@/lib/local-page-idmap";
import { removeLocalFolderOrders } from "@/stores/localFolderOrder";
import { localStorageAdapter as dataStorage } from "@/lib/storage";
import { toast } from "@/components/ui/sonner";
import type { useSettingsImportExport } from "./useSettingsImportExport";

export function useSettingsBackupRestore(
  input: ReturnType<typeof useSettingsImportExport>,
) {
  useLocale();
  const { notebooks, pages, format, createNotebook } = input;

  const clearCurrentContent = async (options?: {
    preserveLocalFolders?: boolean;
    preserveWorkspaceState?: boolean;
  }) => {
    const preserveLocalFolders = options?.preserveLocalFolders ?? false;
    const preserveWorkspaceState = options?.preserveWorkspaceState ?? false;
    const currentNotebooks = useNotebooks.getState().notebooks;
    const localNotebooks = preserveLocalFolders
      ? Object.fromEntries(
          Object.entries(currentNotebooks).filter(
            ([, notebook]) => notebook.source === "local-folder",
          ),
        )
      : {};
    const localNotebookIds = new Set(Object.keys(localNotebooks));
    const allLocalNotebookIds = Object.values(currentNotebooks)
      .filter((notebook) => notebook.source === "local-folder")
      .map((notebook) => notebook.id);
    const localPages = preserveLocalFolders
      ? Object.fromEntries(
          Object.entries(usePages.getState().pages).filter(([, page]) =>
            localNotebookIds.has(page.workspaceId),
          ),
        )
      : {};

    await usePages.getState().flushPendingLocalSaves();
    dataStorage.removeItem("thinkly-notebooks");
    historyRepository.clearAll();
    if (preserveLocalFolders) {
      clearPersistedInternalPages();
    } else {
      clearPersistedPages();
      allLocalNotebookIds.forEach(removeLocalPageIdMap);
      allLocalNotebookIds.forEach(removeLocalFolderOrders);
      clearAllLocalMdSnapshots();
    }
    clearLegacyStorage();
    clearLocalPageMetadataCache();
    if (!preserveWorkspaceState) {
      useNotebookAiChats.getState().clearAllChats();
      useTabs.getState().clearAllTabs();
      window.localStorage.removeItem("thinkly-ai-panel-open");
    }
    useNotebooks.setState({
      notebooks: localNotebooks,
      activeNotebookId: null,
      lastActivePageByNotebook: {},
      localFolderLoadStates: {},
    });
    usePages.setState({
      pages: localPages,
      activePageId: null,
      pendingNavigatePageId: null,
      expandPageId: null,
      searchHighlightQuery: null,
      searchHighlightPageId: null,
      searchHighlightNonce: 0,
      handledSearchHighlightNonce: 0,
      hydrated: true,
      lastSavedAt: null,
      onboardingCompleted: false,
      dirtyLocalPageIds: {},
    });
  };

  const createDefaultNotebook = () => {
    const localNotebooks = Object.fromEntries(
      Object.entries(useNotebooks.getState().notebooks).filter(
        ([, notebook]) => notebook.source === "local-folder",
      ),
    );
    useNotebooks.setState({
      notebooks: localNotebooks,
      activeNotebookId: Object.keys(localNotebooks)[0] ?? null,
      lastActivePageByNotebook: {},
      localFolderLoadStates: {},
    });
  };

  const importBackupIntoEmptyState = async (blob: Blob) => {
    let firstWorkspaceId: string | null = null;
    let firstPageId: string | null = null;
    const { importNotebooksFromZip } = await import("@/lib/export");
    await importNotebooksFromZip(
      blob,
      (name, icon, id) => {
        const newId = createNotebook(name, icon || "BookOpen", true, id);
        if (!firstWorkspaceId) firstWorkspaceId = newId;
        return newId;
      },
      (data, workspaceId, parentId, id) => {
        const pageId = usePages.getState().createPageRecord({
          ...data,
          id,
          workspaceId,
          parentId,
        });
        if (!firstPageId && workspaceId === firstWorkspaceId)
          firstPageId = pageId;
        return pageId;
      },
    );
    if (!firstWorkspaceId) {
      throw new Error(uiText("theBackupContainsNoNotebooksTo_ad6c"));
    }
    useNotebooks.setState({ activeNotebookId: firstWorkspaceId });
    closeNotebookAiIfFullscreen();
    usePages.setState({ activePageId: firstPageId });
  };

  const createRollbackBackup = async (): Promise<Blob | null> => {
    const notebookState = useNotebooks.getState().notebooks;
    const notebookIds = Object.values(notebookState)
      .filter((notebook) => notebook.source !== "local-folder")
      .map((notebook) => notebook.id);
    if (notebookIds.length === 0) return null;
    const { generateExportZip } = await import("@/lib/export");
    return generateExportZip(
      { format: "md", notebookIds },
      notebookState,
      Object.values(usePages.getState().pages),
    );
  };

  const restoreBackupWithRollback = async (zipBlob: Blob) => {
    const { inspectNotebookImportZip } = await import("@/lib/export");
    await inspectNotebookImportZip(zipBlob);
    const rollbackBlob = await createRollbackBackup();

    await clearCurrentContent({
      preserveLocalFolders: true,
      preserveWorkspaceState: true,
    });
    try {
      await importBackupIntoEmptyState(zipBlob);
      useTabs.getState().reconcileTabs();
    } catch (error) {
      console.error("[restore] 导入失败，开始回滚", error);
      try {
        await clearCurrentContent({
          preserveLocalFolders: true,
          preserveWorkspaceState: true,
        });
        if (rollbackBlob) {
          await importBackupIntoEmptyState(rollbackBlob);
        } else {
          createDefaultNotebook();
        }
        useTabs.getState().reconcileTabs();
      } catch (rollbackError) {
        console.error("[restore] 回滚失败", rollbackError);
        throw new Error(uiText("restoreFailedAndAutomaticRollbackDid_84d4"), {
          cause: rollbackError,
        });
      }
      throw new Error(uiText("restoreFailedYourPreviousDataWas_dcd9"), { cause: error });
    }
    toast.success(uiText("restoredAndSynced_ea35"));
  };
  return {
    ...input,
    clearCurrentContent,
    createDefaultNotebook,
    importBackupIntoEmptyState,
    createRollbackBackup,
    restoreBackupWithRollback,
  };
}
