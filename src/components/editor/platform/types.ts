
export interface FileStat {
  size?: number;
  mtime?: number;
  isFile: boolean;
  isDirectory: boolean;
}

export interface DirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  path: string;
}

export interface FsWatchEvent {
  type: "create" | "modify" | "remove" | (string & {});
  path: string;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiSelections?: boolean;
  properties?: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface EditorPlatformFs {
  isAvailable(): boolean;
  readFileAsync(path: string): Promise<string | null>;
  readFileStatAsync(path: string): Promise<FileStat | null>;
  readFileBase64(path: string): Promise<string | null>;
  writeFileAsync(
    path: string,
    content: string,
    encoding?: "utf8" | "base64",
  ): Promise<boolean>;
  writeTempFile(
    relativePath: string,
    contentBase64: string,
  ): Promise<string | null>;
  cleanupTempFiles(prefix: string, maxAgeMs: number): Promise<void>;
  existsAsync(path: string): Promise<boolean>;
  mkdir(path: string): Promise<boolean>;
  readDirAsync(path: string): Promise<DirEntry[]>;
  deleteFile(path: string): Promise<boolean>;
  deleteDir(path: string): Promise<boolean>;
  rename(oldPath: string, newPath: string): Promise<boolean>;
  watch(path: string, cb: (e: FsWatchEvent) => void): () => void;
  revealItemInFolder(path: string): Promise<boolean>;
}

export interface EditorPlatformShell {
  openPath(targetPath: string): Promise<boolean>;
  showItemInFolder(targetPath: string): Promise<boolean>;
  openUrl(url: string): Promise<void>;
  showNotification(body: string): void;
  getDownloadsPath(): Promise<string | null>;
}

export interface EditorPlatformImageStorage {
  save(blob: Blob, mimeType: string): Promise<string>;
  load(ref: string): Promise<Blob | null>;
  delete(ref: string): Promise<void>;
  acquireVideoRefToUrl?(
    ref: string,
    pageLocalFilePath?: string | null,
  ): Promise<{ url: string; release: () => void }>;
  resolveRefToUrl(
    ref: string,
    pageLocalFilePath?: string | null,
  ): Promise<string>;
}

export interface EditorPlatformDialog {
  showSaveDialog(options?: SaveDialogOptions): Promise<string | null>;
  showOpenDialog(options?: OpenDialogOptions): Promise<string[] | null>;
  selectDirectory(): Promise<string | null>;
  restoreLastDirectory(): Promise<string | null>;
}

export interface EditorPlatformClipboard {
  copyText(text: string): Promise<void>;
  copyImage(dataUrl: string, extras?: { html?: string; text?: string }): Promise<void>;
  readText(): Promise<string>;
  readImage(): Promise<string | null>;
}

export interface EditorPlatformAi {
  customFetch?: typeof fetch;
}

export interface EditorPlatform {
  fs: EditorPlatformFs;
  shell: EditorPlatformShell;
  imageStorage: EditorPlatformImageStorage;
  dialog: EditorPlatformDialog;
  clipboard: EditorPlatformClipboard;
  ai: EditorPlatformAi;
}
