import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/empty-state/usePageEmptyState.ts#localMessages:1">`
zh-Hans:
  notebookCreated: "已自动创建笔记本"
  openFailed: "打开文件夹失败："
  pickerUnavailable: "无法打开文件夹选择器"
  newNote: "新建笔记"
  openLocalFolder: "打开本地文件夹"
en:
  notebookCreated: "Notebook created"
  openFailed: "Couldn’t open folder: "
  pickerUnavailable: "The folder picker is unavailable"
  newNote: "New note"
  openLocalFolder: "Open local folder"
ja:
  notebookCreated: "ノートブックを自動的に作成しました"
  openFailed: "フォルダを開けませんでした："
  pickerUnavailable: "フォルダ選択ダイアログを開けません"
  newNote: "ノートを新規作成"
  openLocalFolder: "ローカルフォルダを開く"
`;
const uiText = createTranslator(localMessages);
import { createNamedPage } from "@/lib/create-named-page";
import { activateWorkspace } from "@/lib/settings-navigation";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useEffect, useCallback, useMemo } from "react";
import { toast } from "@/components/ui/sonner";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useTabs } from "@/stores/useTabs";

/** 打开本地文件夹：弹出目录选择器，创建本地文件夹笔记本并加载页面。 */
export function useOpenLocalFolder() {
  const { loadLocalFolderPages } = usePages();
  const createLocalFolderNotebook = useNotebooks((state) => state.createLocalFolderNotebook);
  return useCallback(async () => {
    const desktop = getGooseDesktop();
    if (!desktop) {
      toast.error(uiText("openFailed") + uiText("pickerUnavailable"));
      return;
    }
    try {
      const path = await desktop.selectDirectory({ purpose: "notebook" });
      if (!path) return;
      const folderName = path.split(/[\\/]/).pop() || "Unknown";
      const notebookId = createLocalFolderNotebook(folderName, path);
      await loadLocalFolderPages(notebookId, path, { showWelcome: true });
    } catch (e) {
      console.error(e);
      toast.error(uiText("openFailed") + String(e));
    }
  }, [createLocalFolderNotebook, loadLocalFolderPages]);
}

export function usePageEmptyState() {
  const locale = useLocale();
  const {
    activeNotebookId,
    notebooks,
    createNotebook,
    setActiveNotebook,
  } = useNotebooks();
  const openInCurrentTab = useTabs((state) => state.openInCurrentTab);
  const activeNotebook = activeNotebookId ? notebooks[activeNotebookId] : null;
  const isLocalFolder = activeNotebook?.source === "local-folder";

  const activateOrCreatePage = useCallback(async () => {
    // Electron 仅本地文件夹模式：无仓库时禁止建页，也绝不自动创建内置笔记本
    if (activeNotebook?.source !== "local-folder") return null;
    // 如果没有活跃笔记本，创建一个默认笔记本
    let notebookId = activeNotebookId;
    if (!notebookId) {
      const notebookIds = Object.keys(notebooks);
      if (notebookIds.length === 0) {
        notebookId = createNotebook("我的笔记");
        toast.success(uiText("notebookCreated"));
      } else {
        notebookId = notebookIds[0];
        setActiveNotebook(notebookId);
      }
    }

    const newPageId = await createNamedPage(undefined, notebookId);
    if (newPageId) openInCurrentTab(newPageId);
    return newPageId;
  }, [activeNotebook, activeNotebookId, notebooks, createNotebook, setActiveNotebook, openInCurrentTab]);

  const onCreatePage = useCallback(async () => {
    await activateOrCreatePage();
  }, [activateOrCreatePage]);

  const onOpenLocalFolder = useOpenLocalFolder();

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || isImeKeyboardEvent(e)) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-shortcut-recorder]")) return;
      // 当前系统主键 + Alt + P：新建页面
      if (isPlatformPrimaryModifierEvent(e) && e.altKey && e.key === "p") {
        e.preventDefault();
        activateWorkspace();
        onCreatePage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCreatePage]);

  const actions = useMemo(() => {
    const list: Array<{
      key: string;
      title: string;
      onClick: () => void | Promise<void>;
    }> = [];

    // Electron 无仓库空态：只有「打开文件夹」，不展示新建页面
    const showCreatePage = isLocalFolder;
    if (showCreatePage) {
      list.push({
        key: "create-page",
        title: uiText("newNote"),
        onClick: onCreatePage,
      });
    }

    list.push({
      key: "open-folder",
      title: uiText("openLocalFolder"),
      onClick: onOpenLocalFolder,
    });

    return list;
  }, [
    isLocalFolder,
    onCreatePage,
    onOpenLocalFolder,
  locale,
  ]);

  return { isLocalFolder, actions };
}
