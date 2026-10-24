import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-folder-settings/useLocalFolderSettings.tsx#localMessages:1">`
zh-Hans:
  attachmentCleanupRequiresTheDesktopApp_0b32: "仅桌面应用支持资源清理"
  couldNotOpenTheAttachmentCleanup_59de: "无法打开资源清理窗口"
  someLocalFoldersHaveUnsavedChanges_5f18: "部分本地文件夹仍有未保存内容，已暂缓刷新隐藏目录"
  couldNotRefreshHiddenFolders_1ba7: "刷新隐藏目录失败"
en:
  attachmentCleanupRequiresTheDesktopApp_0b32: "Attachment cleanup requires the desktop app"
  couldNotOpenTheAttachmentCleanup_59de: "Could not open the attachment cleanup window"
  someLocalFoldersHaveUnsavedChanges_5f18: "Some local folders have unsaved changes. Hidden-folder refresh has been postponed."
  couldNotRefreshHiddenFolders_1ba7: "Could not refresh hidden folders"
ja:
  attachmentCleanupRequiresTheDesktopApp_0b32: "添付ファイルの整理はデスクトップアプリでのみ利用できます"
  couldNotOpenTheAttachmentCleanup_59de: "添付ファイルの整理ウィンドウを開けませんでした"
  someLocalFoldersHaveUnsavedChanges_5f18: "一部のローカルフォルダに未保存の変更があるため、非表示フォルダの更新を保留しました"
  couldNotRefreshHiddenFolders_1ba7: "非表示フォルダを更新できませんでした"
`;
const uiText = createTranslator(localMessages);
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_FOLDER_EDITOR_CANDIDATES,
  LOCAL_FOLDER_FILE_MANAGER_CANDIDATES,
  LOCAL_FOLDER_TERMINAL_CANDIDATES,
  type LocalFolderOpenAppCandidate,
} from "@/lib/local-folder-open-apps";
import {
  getCachedAvailableOpenApps,
  shell,
} from "@/lib/electron-platform/shell";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { toast } from "@/components/ui/sonner";
import {
  type SettingsLocalFolderProps,
  getSystemDefaultLabels,
} from "./shared";

function localizeOptions(items: LocalFolderOpenAppCandidate[], candidates: LocalFolderOpenAppCandidate[]) {
  return items.map((item) => ({ ...item, label: candidates.find((candidate) => candidate.id === item.id)?.label ?? item.label }));
}

export function useLocalFolderSettings({
  visible = true,
  localFolderFileManager,
  setLocalFolderFileManager,
  localFolderExternalEditor,
  setLocalFolderExternalEditor,
  localFolderTerminal,
  setLocalFolderTerminal,
  localFolderHiddenFolders,
  setLocalFolderHiddenFolders,
}: SettingsLocalFolderProps) {
  const locale = useLocale();
  const [fileManagerOptions, setFileManagerOptions] = useState<
    LocalFolderOpenAppCandidate[]
  >(
    () =>
      getCachedAvailableOpenApps(LOCAL_FOLDER_FILE_MANAGER_CANDIDATES) ?? [],
  );

  const [editorOptions, setEditorOptions] = useState<
    LocalFolderOpenAppCandidate[]
  >(() => getCachedAvailableOpenApps(LOCAL_FOLDER_EDITOR_CANDIDATES) ?? []);

  const [terminalOptions, setTerminalOptions] = useState<
    LocalFolderOpenAppCandidate[]
  >(() => getCachedAvailableOpenApps(LOCAL_FOLDER_TERMINAL_CANDIDATES) ?? []);

  const systemDefaultLabels = useMemo(() => getSystemDefaultLabels(), [locale]);

  const hiddenFoldersRefreshNonceRef = useRef(0);

  const openAssetMaintenance = async () => {
    try {
      if (!window.gooseDesktop?.assetMaintenance)
        throw new Error(uiText("attachmentCleanupRequiresTheDesktopApp_0b32"));
      await window.gooseDesktop.assetMaintenance.open();
    } catch (error) {
      toast.error(uiText("couldNotOpenTheAttachmentCleanup_59de"), { description: String(error) });
    }
  };

  const handleHiddenFoldersChange = (folders: string[]) => {
    setLocalFolderHiddenFolders(folders);
    const refreshNonce = ++hiddenFoldersRefreshNonceRef.current;

    void (async () => {
      try {
        window.dispatchEvent(
          new CustomEvent("goose-note:flush-editor", {
            detail: { immediate: true },
          }),
        );
        await usePages.getState().flushPendingLocalSaves();
        if (refreshNonce !== hiddenFoldersRefreshNonceRef.current) return;

        const pagesState = usePages.getState();
        const notebookState = useNotebooks.getState();
        const loadedWorkspaceIds = new Set(
          Object.values(pagesState.pages).map((page) => page.workspaceId),
        );
        Object.entries(notebookState.localFolderLoadStates).forEach(
          ([notebookId, state]) => {
            if (state.status === "ready") loadedWorkspaceIds.add(notebookId);
          },
        );
        if (notebookState.activeNotebookId) {
          loadedWorkspaceIds.add(notebookState.activeNotebookId);
        }

        let skippedDirtyNotebook = false;
        for (const notebookId of loadedWorkspaceIds) {
          const notebook = notebookState.notebooks[notebookId];
          if (notebook?.source !== "local-folder" || !notebook.localPath)
            continue;

          const currentPages = usePages.getState();
          const hasDirtyPage = Object.entries(
            currentPages.dirtyLocalPageIds,
          ).some(
            ([pageId, dirty]) =>
              dirty && currentPages.pages[pageId]?.workspaceId === notebookId,
          );
          if (hasDirtyPage) {
            skippedDirtyNotebook = true;
            continue;
          }

          await currentPages.loadLocalFolderPages(
            notebook.id,
            notebook.localPath,
          );
        }

        if (skippedDirtyNotebook) {
          toast.warning(uiText("someLocalFoldersHaveUnsavedChanges_5f18"));
        }
      } catch (error) {
        console.error("[settings] 刷新本地文件夹隐藏目录失败", error);
        toast.error(uiText("couldNotRefreshHiddenFolders_1ba7"), {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const applyAvailableApps = (
      fileManagers: LocalFolderOpenAppCandidate[],
      editors: LocalFolderOpenAppCandidate[],
      terminals: LocalFolderOpenAppCandidate[],
    ) => {
      setFileManagerOptions(fileManagers);
      setEditorOptions(editors);
      setTerminalOptions(terminals);
    };

    const cachedFileManagers = getCachedAvailableOpenApps(
      LOCAL_FOLDER_FILE_MANAGER_CANDIDATES,
    );
    const cachedEditors = getCachedAvailableOpenApps(
      LOCAL_FOLDER_EDITOR_CANDIDATES,
    );
    const cachedTerminals = getCachedAvailableOpenApps(
      LOCAL_FOLDER_TERMINAL_CANDIDATES,
    );

    if (cachedFileManagers && cachedEditors && cachedTerminals) {
      applyAvailableApps(cachedFileManagers, cachedEditors, cachedTerminals);
      return () => {
        cancelled = true;
      };
    }

    const loadAvailableApps = async () => {
      const [fileManagers, editors, terminals] = await Promise.all([
        shell.listAvailableOpenApps(LOCAL_FOLDER_FILE_MANAGER_CANDIDATES),
        shell.listAvailableOpenApps(LOCAL_FOLDER_EDITOR_CANDIDATES),
        shell.listAvailableOpenApps(LOCAL_FOLDER_TERMINAL_CANDIDATES),
      ]);

      if (cancelled) return;
      applyAvailableApps(fileManagers, editors, terminals);
    };

    void loadAvailableApps();

    return () => {
      cancelled = true;
    };
  }, [visible]);
  return {
    visible,
    localFolderFileManager,
    setLocalFolderFileManager,
    localFolderExternalEditor,
    setLocalFolderExternalEditor,
    localFolderTerminal,
    setLocalFolderTerminal,
    localFolderHiddenFolders,
    setLocalFolderHiddenFolders,
    fileManagerOptions: localizeOptions(fileManagerOptions, LOCAL_FOLDER_FILE_MANAGER_CANDIDATES),
    setFileManagerOptions,
    editorOptions: localizeOptions(editorOptions, LOCAL_FOLDER_EDITOR_CANDIDATES),
    setEditorOptions,
    terminalOptions: localizeOptions(terminalOptions, LOCAL_FOLDER_TERMINAL_CANDIDATES),
    setTerminalOptions,
    systemDefaultLabels,
    hiddenFoldersRefreshNonceRef,
    openAssetMaintenance,
    handleHiddenFoldersChange,
  };
}
