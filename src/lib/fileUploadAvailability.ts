import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";

function resolveCurrentNotebookSource(): "default" | "local-folder" | "unknown" {
  const { activePageId, pages } = usePages.getState();
  const pageWorkspaceId = activePageId ? pages[activePageId]?.workspaceId : null;
  const notebookId = pageWorkspaceId ?? useNotebooks.getState().activeNotebookId;

  if (!notebookId) return "unknown";
  const notebook = useNotebooks.getState().notebooks[notebookId];
  return notebook?.source === "local-folder" ? "local-folder" : "default";
}

export function getFileUploadAvailability(): {
  enabled: boolean;
  reason?: string;
} {
  const { activePageId, pages } = usePages.getState();
  const activePage = activePageId ? pages[activePageId] : null;

  if (resolveCurrentNotebookSource() === "local-folder") {
    if (!activePage?.localFilePath) {
      return {
        enabled: false,
        reason: "请先打开文件夹仓库，再插入附件",
      };
    }
    return { enabled: true };
  }

  return { enabled: true };
}
