import { resolveNotebookLandingPageId } from "@/lib/notebookNavigation";
import { ensureEditorFontAvailable } from "@/lib/fontLoader";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import { useTabs } from "@/stores/useTabs";
import type { Page } from "@/types";

export type LastNoteRestoreResult =
  | "restored"
  | "already-active"
  | "not-ready"
  | "disabled"
  | "no-history"
  | "local-folder-unavailable"
  | "opened-associated-file";

let preserveStartupSelection = false;

export function shouldPreserveStartupSelection(): boolean {
  return preserveStartupSelection;
}

export function markAssociatedMarkdownOpened(): void {
  preserveStartupSelection = true;
}

type WorkspaceStartupGateOptions = {
  prepare: () => Promise<unknown> | unknown;
  render: () => void;
  renderError: (error: unknown) => void;
};

export async function renderWorkspaceAfterStartup({
  prepare,
  render,
  renderError,
}: WorkspaceStartupGateOptions): Promise<"rendered" | "error"> {
  try {
    await prepare();
    render();
    return "rendered";
  } catch (error) {
    renderError(error);
    return "error";
  }
}

const isVisiblePageInNotebook = (page: Page | undefined, notebookId: string) =>
  !!page &&
  page.workspaceId === notebookId &&
  !page.trashedAt &&
  !page.isFolder;

const resolveWorkspaceStartupPageId = (
  notebookId: string | null,
): string | null => {
  if (!notebookId) return null;

  const notebooksStore = useNotebooks.getState();
  const pages = usePages.getState().pages;
  const lastPageId = notebooksStore.getLastActivePage(notebookId);
  if (lastPageId && isVisiblePageInNotebook(pages[lastPageId], notebookId)) {
    return lastPageId;
  }

  const regularLandingPageId = resolveNotebookLandingPageId(notebookId);
  if (regularLandingPageId) return regularLandingPageId;

  return (
    Object.values(pages)
      .filter((page) => isVisiblePageInNotebook(page, notebookId))
      .sort(
        (left, right) =>
          (left.order ?? left.createdAt) - (right.order ?? right.createdAt),
      )[0]?.id ?? null
  );
};

export const clearWorkspaceStartupSelection = () => {
  useTabs.setState({ activeTabId: null });
  const pagesStore = usePages.getState();
  if (pagesStore.activePageId) {
    pagesStore.setActivePage(null);
  }
};

export function restoreLastNoteIfNeeded(): LastNoteRestoreResult {
  const pagesStore = usePages.getState();
  if (!pagesStore.hydrated) return "not-ready";
  if (pagesStore.activePageId) {
    const current = pagesStore.pages[pagesStore.activePageId];
    if (!current?.isFolder) return "already-active";
    pagesStore.setActivePage(null);
  }
  if (!useSettings.getState().privacy.autoOpenLastNote) return "disabled";

  const targetPageId = resolveWorkspaceStartupPageId(
    useNotebooks.getState().activeNotebookId,
  );
  if (!targetPageId) return "no-history";

  useTabs.getState().openTab(targetPageId);
  pagesStore.setActivePage(targetPageId);
  return "restored";
}

export async function prepareWorkspaceStartup(): Promise<LastNoteRestoreResult> {
  const pagesStore = usePages.getState();
  if (!pagesStore.hydrated) return "not-ready";

  const { consumePendingAssociatedMarkdownFiles } = await import(
    "@/lib/openAssociatedMarkdown"
  );
  const opened = await consumePendingAssociatedMarkdownFiles();
  if (opened > 0) {
    preserveStartupSelection = true;
    return "opened-associated-file";
  }

  if (!useSettings.getState().privacy.autoOpenLastNote) {
    clearWorkspaceStartupSelection();
    return "disabled";
  }

  const notebooksStore = useNotebooks.getState();
  const activeNotebookId = notebooksStore.activeNotebookId;
  const activeNotebook = activeNotebookId
    ? notebooksStore.notebooks[activeNotebookId]
    : undefined;

  if (
    activeNotebookId &&
    activeNotebook?.source === "local-folder" &&
    activeNotebook.localPath
  ) {
    const gooseFs = typeof window !== "undefined" ? window.gooseFs : undefined;
    if (!gooseFs) {
      clearWorkspaceStartupSelection();
      return "local-folder-unavailable";
    }

    try {
      const { resolveLocalNotebookRoot } = await import("@/lib/resolve-local-notebook");
      const root = await resolveLocalNotebookRoot(activeNotebook);
      if (!root) {
        notebooksStore.updateNotebook(activeNotebookId, {
          localPathMissing: true,
        });
        pagesStore.removePagesByWorkspaceId(activeNotebookId);
        clearWorkspaceStartupSelection();
        return "local-folder-unavailable";
      }

      if (activeNotebook.localPathMissing) {
        notebooksStore.updateNotebook(activeNotebookId, {
          localPathMissing: false,
        });
      }
      await pagesStore.loadLocalFolderPages(
        activeNotebookId,
        root,
      );
    } catch (error) {
      console.error("[bootstrap] 恢复本地文件夹失败", error);
      clearWorkspaceStartupSelection();
      return "local-folder-unavailable";
    }
  }

  const restoreResult = restoreLastNoteIfNeeded();
  const activePageId = usePages.getState().activePageId;
  const activePage = activePageId
    ? usePages.getState().pages[activePageId]
    : undefined;
  await ensureEditorFontAvailable(
    activePage?.fontFamily,
    useSettings.getState().customFonts,
  );
  return restoreResult;
}
