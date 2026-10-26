export type QuickNoteSaveFailureRoute =
  | "open-notebook"
  | "existing-local-recovery"
  | "save-error";

export function routeQuickNoteSaveFailure(input: {
  notebookAvailable: boolean;
  localRecoveryAvailable: boolean;
  openNotebook: () => void;
  showSaveError: () => void;
}): QuickNoteSaveFailureRoute {
  if (!input.notebookAvailable) {
    input.openNotebook();
    return "open-notebook";
  }
  if (input.localRecoveryAvailable) return "existing-local-recovery";
  input.showSaveError();
  return "save-error";
}
