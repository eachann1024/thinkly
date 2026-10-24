import { getGooseDesktop } from "@/lib/electron/runtime";
import { stampNotebookMarker } from "@/lib/notebook-root-paths";
import { commitRenamedNotebookRoot } from "@/lib/rename-notebook-folder";
import type { Notebook } from "@/stores/notebooks/types";
import { useNotebooks } from "@/stores/useNotebooks";

async function pathExists(target: string): Promise<boolean> {
  if (window.gooseFs?.existsAsync) return window.gooseFs.existsAsync(target);
  return window.gooseFs?.exists(target) ?? false;
}

export async function resolveLocalNotebookRoot(notebook: Notebook): Promise<string | null> {
  if (notebook.source !== "local-folder" || !notebook.localPath) return null;
  if (await pathExists(notebook.localPath)) {
    await stampNotebookMarker(notebook.id, notebook.localPath).catch(() => undefined);
    return notebook.localPath;
  }
  const occupiedPaths = Object.values(useNotebooks.getState().notebooks)
    .filter((item) => item.id !== notebook.id && item.localPath)
    .map((item) => item.localPath!);
  const adopted = await getGooseDesktop()?.gitSync?.adoptRenamedNotebookFolder?.({
    notebookId: notebook.id,
    previousLocalPath: notebook.localPath,
    occupiedPaths,
  }).catch(() => null);
  if (!adopted?.localPath) return null;
  await commitRenamedNotebookRoot(notebook.id, notebook.localPath, adopted.localPath, { name: adopted.name });
  return adopted.localPath;
}
