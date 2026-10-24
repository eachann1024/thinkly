import { useNotebooks } from "@/stores/useNotebooks";

export function useFolderToolbarActions() {
  return useNotebooks((state) => {
    const active = state.activeNotebookId
      ? state.notebooks[state.activeNotebookId]
      : undefined;
    if (active) return active.source === "local-folder" && Boolean(active.localPath);
    return Object.values(state.notebooks).some(
      (notebook) => notebook.source === "local-folder" && Boolean(notebook.localPath),
    );
  });
}
