import { shouldIgnoreEntry } from "@/lib/local-folder-scanner/entries";
import { BACKUP_LIMITS, MANIFEST_PATH, fail, type LocalNotebookBackupFs } from "./contract";

const hashDirectory = "[a-f0-9]{8}(?:-[1-9]\\d*)?";
const historyPath = new RegExp(`^\\.goose/history/${hashDirectory}/(?:meta|[A-Za-z0-9_-]+)\\.json$`);

export function safeRelativePath(value: string): boolean {
  const parts = value.split("/");
  return value.length <= 4096 && parts.length <= BACKUP_LIMITS.depth && parts.every((part) => Boolean(part)
    && part !== "." && part !== ".." && !/[\\\u0000-\u001f\u007f:<>"|?*]/.test(part)
    && !/[. ]$/.test(part) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}

export function isBackupFilePath(value: string): boolean {
  if (!safeRelativePath(value) || value === MANIFEST_PATH) return false;
  if (value.startsWith(".goose/")) return value === ".goose/notebook.json"
    || /^\.goose\/metadata\/[a-f0-9]{64}\.json$/.test(value) || historyPath.test(value);
  return value.split("/").every((part) => !shouldIgnoreEntry(part, new Set()));
}

export function isBackupDirectoryPath(value: string): boolean {
  if (!safeRelativePath(value)) return false;
  if (value.startsWith(".goose")) return value === ".goose" || value === ".goose/metadata"
    || value === ".goose/history" || new RegExp(`^\\.goose/history/${hashDirectory}$`).test(value);
  return value.split("/").every((part) => !shouldIgnoreEntry(part, new Set()));
}

export async function checkedRoot(root: string, fs: LocalNotebookBackupFs): Promise<string> {
  const normalized = root.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!/^(?:\/|[A-Za-z]:\/)/.test(normalized) || !normalized || normalized.split("/").some((part) => part === "." || part === "..")
    || /[\u0000-\u001f]/.test(normalized)) fail("Invalid notebook root");
  const real = await fs.realpathAsync(normalized);
  if (!real || real.replace(/\\/g, "/").replace(/\/+$/, "") !== normalized) fail("Notebook root is missing or has a filesystem alias");
  await fs.readDirAsync(normalized);
  return normalized;
}

export async function assertPhysicalPath(root: string, relative: string, fs: LocalNotebookBackupFs): Promise<string> {
  if (!safeRelativePath(relative)) fail("Unsafe file path");
  const file = `${root}/${relative}`;
  const real = await fs.realpathAsync(file);
  if (!real || real.replace(/\\/g, "/") !== file) fail("Filesystem links are not supported");
  return file;
}

export function assertDistinctPaths(names: string[]): void {
  const files = new Set<string>();
  const directories = new Set<string>();
  for (const name of names) {
    const folded = name.normalize("NFC").toLowerCase();
    if (files.has(folded) || directories.has(folded)) fail("Duplicate or conflicting paths");
    const parts = folded.split("/");
    parts.pop();
    while (parts.length) {
      const parent = parts.join("/");
      if (files.has(parent)) fail("A file occupies a directory path");
      directories.add(parent);
      parts.pop();
    }
    files.add(folded);
  }
}
