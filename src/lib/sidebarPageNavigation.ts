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

/** 桌面本地模式：文件夹只用于侧栏展开/收起，不作为可打开的页面。 */
export function isElectronLocalFolderDirectory(pageId: string): boolean {
  return isLocalFolderDirectoryPage(pageId);
}

export function openPageFromSidebar(
  pageId: string,
  mode: "preview" | "permanent",
  options?: { pin?: boolean; newTab?: boolean },
) {
  // 文件夹只在侧栏展开，不打开内容页。
  if (isElectronLocalFolderDirectory(pageId)) return;

  // AI 全屏时主区域被会话盖住：侧栏点页面应退出 AI 并切到该标签
  // （与标签栏 onBeforeActivateTab 行为对齐）
  closeNotebookAiIfFullscreen();

  const tabs = useTabs.getState();
  if (!options?.newTab && tryShowPageInFocusedSplit(pageId)) {
    usePages.getState().setExpandPageId(pageId);
    window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
    return;
  }
  if (!effectiveSingleTabMode() && mode === "permanent" && options?.newTab) {
    suppressNextSidebarSelect = true;
    if (suppressTimer !== null) window.clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(() => {
      suppressNextSidebarSelect = false;
      suppressTimer = null;
    }, 400);
    tabs.openPermanentTab(pageId, { pin: options.pin });
    window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
    return;
  }
  tabs.openPreviewTab(pageId);
  window.dispatchEvent(new CustomEvent("goose-note:sidebar-navigation-complete"));
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
