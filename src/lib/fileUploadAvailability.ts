import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/fileUploadAvailability.ts#localMessages:1">`
zh-Hans:
  openALocalFolderNotebookBeforeInsertingAttachments: "请先打开本地文件夹笔记本，再插入附件"
en:
  openALocalFolderNotebookBeforeInsertingAttachments: "Open a local folder notebook before inserting attachments"
ja:
  openALocalFolderNotebookBeforeInsertingAttachments: "添付ファイルを挿入するには、先にローカルフォルダのノートブックを開いてください"
`;
const uiText = createTranslator(localMessages);
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
        reason: uiText("openALocalFolderNotebookBeforeInsertingAttachments"),
      };
    }
    return { enabled: true };
  }

  return { enabled: true };
}
