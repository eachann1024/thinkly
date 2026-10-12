import { activateWorkspace } from "@/lib/settings-navigation";
import { isImeKeyboardEvent } from "@/hooks/useImeInput";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useEffect, useCallback, useMemo } from "react";
import { toast } from "@/components/ui/sonner";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { requestPageTitleFocus } from "@/lib/page-title-focus";
import { DEFAULT_NOTEBOOK } from "@/stores/useNotebooks";
import { dialogs } from "@/lib/electron-platform/dialogs";
import { useTabs } from "@/stores/useTabs";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { isElectronHost } from "@/lib/local-vault";

const isEmptyContent = (
  content:
    | {
        type?: string;
        content?: Array<{
          type?: string;
          content?: unknown[];
        }>;
      }
    | null
    | undefined,
) => {
  if (!content || content.type !== "doc") return true;
  if (!content.content || content.content.length === 0) return true;
  if (content.content.length === 1) {
    const first = content.content[0];
    if (
      first.type === "paragraph" &&
      (!first.content || first.content.length === 0)
    ) {
      return true;
    }
  }
  return false;
};

export function usePageEmptyState() {
  const {
    createPage,
    createLocalPage,
    pages,
    loadLocalFolderPages,
  } = usePages();
  const {
    activeNotebookId,
    notebooks,
    createNotebook,
    setActiveNotebook,
    createLocalFolderNotebook,
  } = useNotebooks();
  const openInCurrentTab = useTabs((state) => state.openInCurrentTab);
  const activeNotebook = activeNotebookId ? notebooks[activeNotebookId] : null;
  const isLocalFolder = activeNotebook?.source === "local-folder";

  const activateOrCreatePage = useCallback(async () => {
    // Electron 仅本地文件夹模式：无仓库时禁止建页，也绝不自动创建内置笔记本
    if (isElectronHost && activeNotebook?.source !== "local-folder") return null;
    // 如果没有活跃笔记本，创建一个默认笔记本
    let notebookId = activeNotebookId;
    if (!notebookId) {
      const notebookIds = Object.keys(notebooks);
      if (notebookIds.length === 0) {
        notebookId = createNotebook("我的笔记");
        toast.success("已自动创建笔记本");
      } else {
        notebookId = notebookIds[0];
        setActiveNotebook(notebookId);
      }
    }

    const notebook = notebookId ? notebooks[notebookId] : undefined;
    const isLocalFolder = notebook?.source === "local-folder";

    if (isLocalFolder) {
      const localPageId = await createLocalPage(undefined, notebookId || undefined);
      if (localPageId) openInCurrentTab(localPageId);
      return localPageId;
    }

    const matchWorkspaceId = notebookId || DEFAULT_NOTEBOOK;
    const existingBlankPage = Object.values(pages).find((p) => {
      const matchWorkspace = p.workspaceId === matchWorkspaceId;
      const notTrashed = !p.trashedAt;
      const title = getPageTitle(p);
      const isBlankTitle = !title || title === "无标题" || title.trim() === "";
      const isBlankContent = isEmptyContent(p.content);
      return matchWorkspace && notTrashed && isBlankTitle && isBlankContent;
    });

    if (existingBlankPage) {
      openInCurrentTab(existingBlankPage.id);
      requestPageTitleFocus(existingBlankPage.id);
      if (!effectiveSingleTabMode()) {
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("goose-note:focus-editor-start"),
          );
        }, 100);
      }
      return existingBlankPage.id;
    }

    const newPageId = createPage(undefined, matchWorkspaceId);
    openInCurrentTab(newPageId);
    return newPageId;
  }, [
    activeNotebook,
    activeNotebookId,
    notebooks,
    createNotebook,
    setActiveNotebook,
    createLocalPage,
    openInCurrentTab,
    pages,
    createPage,
  ]);

  const onCreatePage = useCallback(async () => {
    await activateOrCreatePage();
  }, [activateOrCreatePage]);

  const onOpenLocalFolder = useCallback(async () => {
    try {
      const path = await dialogs.selectDirectory();
      if (path) {
        const folderName = path.split(/[\\/]/).pop() || "Unknown";
        const notebookId = createLocalFolderNotebook(folderName, path);
        await loadLocalFolderPages(notebookId, path, { showWelcome: true });
      }
    } catch (e) {
      console.error(e);
      toast.error("打开文件夹失败：" + String(e));
    }
  }, [createLocalFolderNotebook, loadLocalFolderPages]);

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || isImeKeyboardEvent(e)) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-shortcut-recorder]")) return;
      // Cmd+Option+P: 新建页面
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "p") {
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
    const showCreatePage = !isElectronHost || isLocalFolder;
    if (showCreatePage) {
      list.push({
        key: "create-page",
        title: "新建笔记",
        onClick: onCreatePage,
      });
    }

    list.push({
      key: "open-folder",
      title: "打开本地文件夹",
      onClick: onOpenLocalFolder,
    });

    return list;
  }, [
    isLocalFolder,
    onCreatePage,
    onOpenLocalFolder,
  ]);

  return { isLocalFolder, actions };
}
