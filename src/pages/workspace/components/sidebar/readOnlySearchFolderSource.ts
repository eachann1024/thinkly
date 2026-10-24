import { scanLocalFolderPages } from "@/lib/local-folder-scanner";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import { useSettings } from "@/stores/useSettings";
import type { SearchFolderSource } from "./useSearchFolderRefresh";

const loaded = new Set<string>();

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
