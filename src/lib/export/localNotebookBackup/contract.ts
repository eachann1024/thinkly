export type LocalNotebookBackupFs = Required<Pick<GooseFs,
  "readDirAsync" | "readFileBase64Async" | "readFileAsync" | "writeFileAsync" |
  "createFileAsync" | "existsAsync" | "realpathAsync" | "mkdir" | "deleteFile" | "deleteDir"
>>;

export type BackupFiles = Map<string, Uint8Array>;
export type BackupManifest = {
  format: "thinkly-local-notebook";
  version: 1;
  notebookId: string;
  files: { path: string; size: number; sha256: string }[];
};

export const MANIFEST_PATH = "thinkly-local-backup.json";
export const BACKUP_LIMITS = {
  entries: 10_000,
  fileBytes: 128 * 1024 * 1024,
  totalBytes: 512 * 1024 * 1024,
  archiveBytes: 256 * 1024 * 1024,
  depth: 64,
};

export function fail(message: string): never { throw new Error(`Notebook backup: ${message}`); }
export const textBytes = (text: string) => new TextEncoder().encode(text);
export const decodeText = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
export function decodeBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) fail("Invalid binary data");
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
export function encodeBase64(bytes: Uint8Array): string {
  let value = "";
  for (let index = 0; index < bytes.length; index += 16384) value += String.fromCharCode(...bytes.subarray(index, index + 16384));
  return btoa(value);
}
export async function bytesDigest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("");
}
export const equalBytes = (left: Uint8Array, right: Uint8Array) => left.length === right.length && left.every((value, index) => value === right[index]);
