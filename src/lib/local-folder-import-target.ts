import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";
import type { LocalAssetTarget } from "./local-file-asset-contract";

export function resolveLocalFolderImportTarget(workspaceId: string, parentId?: string): LocalAssetTarget | null {
  const notebook = useNotebooks.getState().notebooks[workspaceId];
  if (notebook?.source !== "local-folder" || !notebook.localPath || notebook.localPathMissing) return null;
  const parent = parentId ? usePages.getState().pages[parentId] : null;
  if (parentId && (!parent?.isFolder || !parent.localFilePath || parent.workspaceId !== workspaceId || parent.trashedAt)) return null;
  const directory = (parent?.localFilePath ?? notebook.localPath).replace(/[\\/]$/, "");
  return { workspaceId, notebookRoot: notebook.localPath, pageLocalFilePath: `${directory}/_import.md` };
}
