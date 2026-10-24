export interface DirectoryDialogOptions {
  purpose?: "notebook" | "recovery";
  defaultPath?: string;
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
