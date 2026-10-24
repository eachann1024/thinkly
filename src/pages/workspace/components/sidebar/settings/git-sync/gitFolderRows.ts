import { comparisonLocalPath, localPathsAreCaseInsensitive } from "@/lib/canonicalLocalPath";
import type { GitRepositoryFolder } from "@/lib/git-sync-contract";
import type { Notebook } from "@/stores/notebooks/types";

export const folderPathKey = (path: string) =>
  comparisonLocalPath(path, localPathsAreCaseInsensitive()).replace(/\/+$/, "");

export function reconcileFolderSelection(folders: GitRepositoryFolder[], notebooks: Notebook[]) {
  let changed = false;
  const seen = new Set<string>();
  const next: GitRepositoryFolder[] = [];
  for (const folder of folders) {
    const notebook = notebooks.find((item) => item.localPath && folderPathKey(item.localPath) === folderPathKey(folder.localPath));
    const current = notebook && !notebook.localPathMissing
      ? { ...folder, notebookId: notebook.id, name: notebook.name, localPath: notebook.localPath! }
      : folder;
    if (seen.has(current.notebookId)) { changed = true; continue; }
    seen.add(current.notebookId);
    changed ||= current.notebookId !== folder.notebookId || current.name !== folder.name || current.localPath !== folder.localPath;
    next.push(current);
  }
  return changed ? next : folders;
}

export function gitFolderRows(notebooks: Notebook[], selected: GitRepositoryFolder[], history: GitRepositoryFolder[]) {
  const rows = notebooks.map((notebook) => {
    const mapping = [...selected, ...history].find((folder) => folder.notebookId === notebook.id
      || folderPathKey(folder.localPath) === folderPathKey(notebook.localPath!));
    return { notebookId: notebook.id, localPath: notebook.localPath!, name: notebook.name, remotePath: mapping?.remotePath ?? "" };
  });
  for (const folder of selected) {
    if (!rows.some((row) => row.notebookId === folder.notebookId)) rows.push(folder);
  }
  return rows;
}
