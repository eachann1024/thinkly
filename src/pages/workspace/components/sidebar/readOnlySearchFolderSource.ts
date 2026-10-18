import { scanLocalFolderPages } from "@/lib/local-folder-scanner";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import type { SearchFolderSource } from "./useSearchFolderRefresh";

const loaded = new Set<string>();

/**
 * 浮动搜索窗与主窗并行运行，只读取本地文件夹：不写 id 映射、不做恢复、
 * 不记历史墓碑、不改标签与手动排序。扫描结果只替换本窗口内存里的页面。
 */
async function loadReadOnly(notebookId: string, basePath: string): Promise<void> {
  const gooseFs = typeof window === "undefined" ? undefined : window.gooseFs;
  if (!gooseFs) return;
  const scanned = await scanLocalFolderPages({
    notebookId,
    basePath,
    gooseFs,
    hiddenFolders: [...useSettings.getState().localFolderHiddenFolders],
    readOnly: true,
  });
  if (useNotebooks.getState().notebooks[notebookId]?.localPath !== basePath) return;
  usePages.setState((state) => {
    const pages = Object.fromEntries(
      Object.entries(state.pages).filter(([, page]) => page.workspaceId !== notebookId),
    );
    for (const page of scanned) pages[page.id] = page;
    return { pages };
  });
  loaded.add(notebookId);
}

export const readOnlySearchFolderSource: SearchFolderSource = {
  isReady: (id) => loaded.has(id),
  isLive: () => false,
  load: loadReadOnly,
};
