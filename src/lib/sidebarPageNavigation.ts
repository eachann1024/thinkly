import { useTabs } from "@/stores/useTabs";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { tryShowPageInFocusedSplit } from "@/lib/editor-split/commands";
import { closeNotebookAiIfFullscreen } from "@/pages/workspace/components/notebook-ai/useNotebookAiPanel";

let suppressNextSidebarSelect = false;
let suppressTimer: number | null = null;

export function isLocalFolderDirectoryPage(pageId: string): boolean {
  const page = usePages.getState().getPage(pageId);
  if (!page?.isFolder) return false;
  const notebook = useNotebooks.getState().notebooks[page.workspaceId];
  return notebook?.source === "local-folder";
}

export function isElectronLocalFolderDirectory(pageId: string): boolean {
  return isLocalFolderDirectoryPage(pageId);
}

export function openPageFromSidebar(
  pageId: string,
  mode: "preview" | "permanent",
  options?: { newTab?: boolean },
) {
  if (isElectronLocalFolderDirectory(pageId)) return;

  closeNotebookAiIfFullscreen();

  const tabs = useTabs.getState();
  if (!options?.newTab && tryShowPageInFocusedSplit(pageId)) {
    usePages.getState().setExpandPageId(pageId);
    notifySidebarNavigation(pageId);
    return;
  }
  if (!effectiveSingleTabMode() && mode === "permanent" && options?.newTab) {
    suppressNextSidebarSelect = true;
    if (suppressTimer !== null) window.clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(() => {
      suppressNextSidebarSelect = false;
      suppressTimer = null;
    }, 400);
    tabs.openPermanentTab(pageId);
    notifySidebarNavigation(pageId);
    return;
  }
  tabs.openPreviewTab(pageId);
  notifySidebarNavigation(pageId);
}

function notifySidebarNavigation(pageId: string) {
  window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete", {
    detail: { pageId },
  }));
}

export function shouldSuppressSidebarSelect(): boolean {
  if (!suppressNextSidebarSelect) return false;
  suppressNextSidebarSelect = false;
  if (suppressTimer !== null) {
    window.clearTimeout(suppressTimer);
    suppressTimer = null;
  }
  return true;
}
