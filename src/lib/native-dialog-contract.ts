export interface DirectoryDialogOptions {
  purpose?: "notebook" | "recovery";
  /** A specific folder being recovered takes precedence over remembered locations. */
  defaultPath?: string;
  /** Used only when the main process has no remembered location (legacy migration). */
  fallbackPath?: string;
}

export interface OpenFileDialogOptions {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}

export interface SaveFileDialogOptions {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}
